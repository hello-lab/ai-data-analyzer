import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import _ from 'lodash';
import { kmeans } from 'ml-kmeans';

// Helper Functions
function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stats(arr: any[], key: string) {
  const values = arr.map(u => u[key]);
  return {
    avg: _.mean(values),
    min: _.min(values),
    max: _.max(values),
    median: median(values),
    stddev: Math.sqrt(_.mean(values.map(v => Math.pow(v - _.mean(values), 2)))),
  };
}

function zscore(value: number, mean: number, stddev: number): number {
  if (stddev === 0) return 0;
  return (value - mean) / stddev;
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

async function readCSVData(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const users: any[] = [];
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

    // 5. Personalized Recommendations (suggest pushup goal based on cluster)
    clusters.centroids.forEach((centroid, i) => {
      const avgPushup = centroid[1];
      processed.filter(u => u.cluster === i).forEach(u => {
        u.recommended_pushup = Math.round(avgPushup * 1.1);
      });
    });

    // 6. Nearest Behavioral Neighbor (find the most similar user)
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

    // 7. Team-level Analytics
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

    // 8. Behavioral Pattern: Do users with high balance also have high activity?
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