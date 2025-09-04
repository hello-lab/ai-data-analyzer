const fs = require('fs');
const csv = require('csv-parser');
const _ = require('lodash');
const { Parser } = require('json2csv');
const { kmeans } = require('ml-kmeans');

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

const users = [];
fs.createReadStream('users.csv')
  .pipe(csv())
  .on('data', (row) => users.push(row))
  .on('end', () => {
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
    const clusters = kmeans(vectors, 4);
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
            minDist = dist; nearest = processed[j].username;
          }
        }
      });
      u.similar_user = nearest;
    });

    // 7. Challenge Assignment
    // Assign challenges based on user's weakest performance area relative to their cluster
    processed.forEach(u => {
      // Get the centroid values for the user's cluster
      const clusterCentroid = clusters.centroids[u.cluster];
      const [centroidSteps, centroidPushup, centroidSquat] = clusterCentroid;
      
      // Calculate performance ratios compared to cluster average
      const stepRatio = centroidSteps > 0 ? u.stepcount / centroidSteps : 0;
      const pushupRatio = centroidPushup > 0 ? u.pushup / centroidPushup : 0;
      const squatRatio = centroidSquat > 0 ? u.squat / centroidSquat : 0;
      
      // Find the area with the lowest performance ratio
      const ratios = [
        { type: 'steps', ratio: stepRatio },
        { type: 'pushup', ratio: pushupRatio },
        { type: 'squat', ratio: squatRatio }
      ];
      
      // Sort by ratio to find the weakest area
      ratios.sort((a, b) => a.ratio - b.ratio);
      
      // Assign challenge type based on weakest area
      u.challenge_type = ratios[0].type;
      
      // Set deadline based on challenge difficulty (30 days + extra time for harder challenges)
      const baseDeadlineDays = 30;
      let extraDays = 0;
      
      // Add extra time based on how far below cluster average they are
      const worstRatio = ratios[0].ratio;
      if (worstRatio < 0.5) {
        extraDays = 14; // Very low performance, give more time
      } else if (worstRatio < 0.8) {
        extraDays = 7; // Somewhat low performance, give some extra time
      }
      
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + baseDeadlineDays + extraDays);
      u.deadline = deadlineDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
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

    // 10. Summary Report
    let report = `
COMPLEX AI METRICS REPORT
=========================
User Segmentation (Clusters):
${clusters.centroids.map((c, i) => `- Cluster ${i}: ${processed.filter(u => u.cluster === i).length} users (centroid: ${c.map(x=>x.toFixed(1)).join(', ')})`).join('\n')}

Top 5 Engagement Index:
${_.orderBy(processed, ['engagement_index'], ['desc']).slice(0,5).map(u => u.username + ' (' + u.engagement_index.toFixed(2) + ')').join(', ')}

Top 5 Most Consistent Users:
${_.orderBy(processed, ['activity_consistency'], ['desc']).slice(0,5).map(u => u.username + ' (' + u.activity_consistency.toFixed(3) + ')').join(', ')}

Anomalous Users (statistical outliers):
${processed.filter(u => u.is_outlier).map(u => u.username).join(', ') || 'None'}

Recommended Pushup Goals (sample):
${processed.slice(0,5).map(u => u.username + ': ' + u.recommended_pushup).join(', ')}

Nearest Behavioral Neighbors (sample):
${processed.slice(0,5).map(u => u.username + ' ~ ' + u.similar_user).join(', ')}

Team Analytics:
${teamStats.map(t => `Team: ${t.team}, Avg Step: ${t.avgStep.toFixed(1)}, Avg Pushup: ${t.avgPushup.toFixed(1)}, Avg Squat: ${t.avgSquat.toFixed(1)}, Avg Balance: ${t.avgBalance.toFixed(1)}, Avg Engagement: ${t.engagement.toFixed(2)}, Members: ${t.members}`).join('\n')}

Balance vs Stepcount Correlation: ${corrBalanceStep.toFixed(3)}

Challenge Distribution:
${['steps', 'pushup', 'squat'].map(type => `${type}: ${processed.filter(u => u.challenge_type === type).length} users`).join(', ')}

Sample Challenge Assignments:
${processed.slice(0,5).map(u => `${u.username}: ${u.challenge_type} (deadline: ${u.deadline})`).join(', ')}

(See processed_users_complex.csv for full annotated data)
`;

    fs.writeFileSync('complex_metrics_report.txt', report);
    console.log('Complex AI metrics report written to complex_metrics_report.txt');

    // Export all processed data
    const parser = new Parser();
    fs.writeFileSync('processed_users_complex.csv', parser.parse(processed));
    console.log('Processed user data written to processed_users_complex.csv');
  });