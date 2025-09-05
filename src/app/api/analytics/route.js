import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import _ from 'lodash';
import { kmeans } from 'ml-kmeans';

// Helper Functions
function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stats(arr, key) {
  const values = arr.map(u => u[key]);
  return {
    avg: _.mean(values),
    min: _.min(values),
    max: _.max(values),
    median: median(values),
    stddev: Math.sqrt(_.mean(values.map(v => Math.pow(v - _.mean(values), 2)))),
  };
}

function zscore(value, mean, stddev) {
  if (stddev === 0) return 0;
  return (value - mean) / stddev;
}

function euclidean(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

async function readCSVData() {
  return new Promise((resolve, reject) => {
    const users = [];
    const csvPath = path.join(process.cwd(), 'users.csv');
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => users.push(row))
      .on('end', () => resolve(users))
      .on('error', (error) => reject(error));
  });
}

export async function GET() {
  try {
    const users = await readCSVData();
    
    // Preprocess
    const processed = users.map(u => ({
      ...u,
      balance: Number(u.balance),
      stepcount: Number(u.stepcount),
      pushup: Number(u.pushup),
      squat: Number(u.squat),
      team: u.team || 'None',
      email: u.email || '',
      transactions: u.transactions || '',
      password: u.password || '',
    }));

    // Feature vectors
    const vectors = processed.map(u =>
      [u.stepcount, u.pushup, u.squat, u.balance]
    );

    // 1. User Segmentation (KMeans, k=4)
    const clusters = kmeans(vectors, 4, {});
    processed.forEach((u, i) => { u.cluster = clusters.clusters[i]; });

    // 2. Engagement Index (weighted sum)
    processed.forEach(u => {
      u.engagement_index = (u.stepcount * 0.4) + (u.pushup * 0.2) + (u.squat * 0.2) + (u.balance * 0.2);
    });

    // 3. Activity Consistency Score (low stddev = high consistency)
    processed.forEach(u => {
      const activityValues = [u.stepcount, u.pushup, u.squat];
      const mean = _.mean(activityValues);
      const variance = _.mean(activityValues.map(v => Math.pow(v - mean, 2)));
      const stddev = Math.sqrt(variance);
      u.activity_consistency = 1 / (1 + stddev);
    });

    // 4. Outlier Detection (z-score for each metric, flag if any > 3 or < -3)
    const stepStats = stats(processed, 'stepcount');
    const pushupStats = stats(processed, 'pushup');
    const squatStats = stats(processed, 'squat');
    const balanceStats = stats(processed, 'balance');

    processed.forEach(u => {
      u.stepcount_z = zscore(u.stepcount, stepStats.avg, stepStats.stddev);
      u.pushup_z = zscore(u.pushup, pushupStats.avg, pushupStats.stddev);
      u.squat_z = zscore(u.squat, squatStats.avg, squatStats.stddev);
      u.balance_z = zscore(u.balance, balanceStats.avg, balanceStats.stddev);
      u.is_outlier = (
        Math.abs(u.stepcount_z) > 3 ||
        Math.abs(u.pushup_z) > 3 ||
        Math.abs(u.squat_z) > 3 ||
        Math.abs(u.balance_z) > 3
      ) ? 1 : 0;
    });

    // 5. Enhanced Personalized Recommendations (different target types based on cluster analysis)
    clusters.centroids.forEach((centroid, i) => {
      const clusterUsers = processed.filter(u => u.cluster === i);
      const avgSteps = centroid[0];
      const avgPushup = centroid[1];
      const avgSquat = centroid[2];
      const avgBalance = centroid[3];
      
      clusterUsers.forEach(u => {
        // Determine primary weakness and set different challenge types
        const userVector = [u.stepcount, u.pushup, u.squat, u.balance];
        const centroidVector = [avgSteps, avgPushup, avgSquat, avgBalance];
        
        // Find which metric is furthest below cluster average (normalized)
        const gaps = [
          (avgSteps - u.stepcount) / avgSteps,
          (avgPushup - u.pushup) / (avgPushup || 1),
          (avgSquat - u.squat) / (avgSquat || 1),
          (avgBalance - u.balance) / (avgBalance || 1)
        ];
        
        const maxGapIndex = gaps.indexOf(Math.max(...gaps));
        
        // Set targets based on cluster performance + 10-20% improvement
        u.recommended_steps = Math.round(Math.max(u.stepcount, avgSteps * 1.15));
        u.recommended_pushups = Math.round(Math.max(u.pushup, avgPushup * 1.1));
        u.recommended_squats = Math.round(Math.max(u.squat, avgSquat * 1.1));
        
        // Primary challenge based on biggest gap
        switch(maxGapIndex) {
          case 0: // Steps
            u.primary_challenge = 'steps';
            u.primary_target = u.recommended_steps;
            u.challenge_description = `Increase daily steps to ${u.recommended_steps}`;
            break;
          case 1: // Pushups
            u.primary_challenge = 'pushups';
            u.primary_target = u.recommended_pushups;
            u.challenge_description = `Improve pushup count to ${u.recommended_pushups}`;
            break;
          case 2: // Squats
            u.primary_challenge = 'squats';
            u.primary_target = u.recommended_squats;
            u.challenge_description = `Reach squat goal of ${u.recommended_squats}`;
            break;
          default: // Balance (or general improvement)
            u.primary_challenge = 'overall';
            u.primary_target = Math.round(u.engagement_index * 1.2);
            u.challenge_description = `Improve overall engagement to ${u.primary_target}`;
        }
      });
    });

    // 6. Smart Deadline Assignment Based on Performance Data
    processed.forEach(u => {
      const baseDeadlineDays = 30; // Base 30 days
      
      // Adjust based on consistency (high consistency = shorter deadline)
      const consistencyMultiplier = u.activity_consistency > 0.7 ? 0.8 : 
                                   u.activity_consistency > 0.5 ? 1.0 : 1.3;
      
      // Adjust based on engagement level (high engagement = shorter deadline) 
      const engagementPercentile = processed
        .map(p => p.engagement_index)
        .filter(e => e <= u.engagement_index).length / processed.length;
      
      const engagementMultiplier = engagementPercentile > 0.8 ? 0.7 :
                                  engagementPercentile > 0.6 ? 0.9 :
                                  engagementPercentile > 0.4 ? 1.0 : 1.2;
      
      // Adjust based on challenge difficulty
      const currentPerformance = u[u.primary_challenge === 'steps' ? 'stepcount' : 
                                   u.primary_challenge === 'pushups' ? 'pushup' :
                                   u.primary_challenge === 'squats' ? 'squat' : 'engagement_index'];
      const targetGap = (u.primary_target - currentPerformance) / (currentPerformance || 1);
      const difficultyMultiplier = targetGap > 0.5 ? 1.4 :
                                  targetGap > 0.3 ? 1.2 :
                                  targetGap > 0.1 ? 1.0 : 0.8;
      
      // Calculate final deadline
      const adjustedDays = Math.round(baseDeadlineDays * consistencyMultiplier * engagementMultiplier * difficultyMultiplier);
      const clampedDays = Math.max(7, Math.min(60, adjustedDays)); // Between 1 week and 2 months
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + clampedDays);
      
      u.challenge_deadline = deadline.toISOString().split('T')[0]; // YYYY-MM-DD format
      u.deadline_days = clampedDays;
      u.deadline_reason = `Based on consistency (${u.activity_consistency.toFixed(2)}), engagement level (${Math.round(engagementPercentile * 100)}th percentile), and target difficulty (${Math.round(targetGap * 100)}% improvement)`;
    });

    // 7. Nearest Behavioral Neighbor (find the most similar user)
    processed.forEach((u, idx) => {
      let minDist = Infinity, nearest = null;
      vectors.forEach((v, j) => {
        if (idx !== j) {
          const dist = euclidean(v, vectors[idx]);
          if (dist < minDist) {
            minDist = dist; 
            nearest = processed[j].username;
          }
        }
      });
      u.similar_user = nearest;
    });

    // 8. Team-level Analytics
    const teams = _.uniq(processed.map(u => u.team));
    const teamStats = teams.map(team => {
      const teamUsers = processed.filter(u => u.team === team);
      return {
        team,
        avgStep: _.meanBy(teamUsers, 'stepcount'),
        avgPushup: _.meanBy(teamUsers, 'pushup'),
        avgSquat: _.meanBy(teamUsers, 'squat'),
        avgBalance: _.meanBy(teamUsers, 'balance'),
        engagement: _.meanBy(teamUsers, 'engagement_index'),
        members: teamUsers.length,
      };
    });

    // 9. Behavioral Pattern: Do users with high balance also have high activity?
    const corrBalanceStep = (() => {
      const x = processed.map(u => u.balance);
      const y = processed.map(u => u.stepcount);
      const meanX = _.mean(x), meanY = _.mean(y);
      const num = _.sum(x.map((xi, i) => (xi - meanX) * (y[i] - meanY)));
      const den = Math.sqrt(_.sum(x.map(xi => Math.pow(xi - meanX, 2))) * _.sum(y.map(yi => Math.pow(yi - meanY, 2))));
      return (den === 0) ? 0 : num / den;
    })();

    // Prepare cluster summary
    const clusterSummary = clusters.centroids.map((c, i) => ({
      clusterId: i,
      userCount: processed.filter(u => u.cluster === i).length,
      centroid: {
        stepcount: c[0],
        pushup: c[1],
        squat: c[2],
        balance: c[3]
      }
    }));

    // Top performers
    const topEngagement = _.orderBy(processed, ['engagement_index'], ['desc']).slice(0, 10);
    const topConsistency = _.orderBy(processed, ['activity_consistency'], ['desc']).slice(0, 10);
    const outliers = processed.filter(u => u.is_outlier);

    // Prepare response data
    const responseData = {
      summary: {
        totalUsers: processed.length,
        totalTeams: teams.length,
        correlationBalanceStep: corrBalanceStep,
        clusters: clusterSummary
      },
      users: processed,
      teamStats,
      topPerformers: {
        engagement: topEngagement,
        consistency: topConsistency,
        outliers
      },
      statistics: {
        stepcount: stepStats,
        pushup: pushupStats,
        squat: squatStats,
        balance: balanceStats
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error processing analytics:', error);
    return NextResponse.json({ error: 'Failed to process analytics data' }, { status: 500 });
  }
}