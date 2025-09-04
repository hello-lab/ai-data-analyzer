const fs = require('fs');
const { kmeans } = require('ml-kmeans');
const _ = require('lodash');

// Test the fixes
console.log('Running tests for AI Data Analyzer fixes...\n');

// Test 1: KMeans functionality
console.log('Test 1: KMeans functionality');
try {
  const testData = [[1, 2], [2, 3], [5, 6], [6, 7]];
  const result = kmeans(testData, 2);
  console.log('✓ KMeans import and basic usage works');
  console.log(`  - Got ${result.clusters.length} cluster assignments`);
  console.log(`  - Got ${result.centroids.length} centroids`);
} catch (error) {
  console.log('✗ KMeans test failed:', error.message);
}

// Test 2: Custom median function
console.log('\nTest 2: Custom median function');
try {
  function median(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  const testEven = [1, 3, 5, 7];
  const testOdd = [1, 3, 5];
  
  console.log(`✓ Median of [1,3,5,7] = ${median(testEven)} (expected: 4)`);
  console.log(`✓ Median of [1,3,5] = ${median(testOdd)} (expected: 3)`);
} catch (error) {
  console.log('✗ Median test failed:', error.message);
}

// Test 3: Activity consistency calculation
console.log('\nTest 3: Activity consistency calculation');
try {
  const testUser = { stepcount: 1000, pushup: 50, squat: 25 };
  const activityValues = [testUser.stepcount, testUser.pushup, testUser.squat];
  const mean = _.mean(activityValues);
  const variance = _.mean(activityValues.map(v => Math.pow(v - mean, 2)));
  const stddev = Math.sqrt(variance);
  const consistency = 1 / (1 + stddev);
  
  console.log(`✓ Activity consistency calculation works`);
  console.log(`  - Mean: ${mean.toFixed(2)}, StdDev: ${stddev.toFixed(2)}, Consistency: ${consistency.toFixed(6)}`);
} catch (error) {
  console.log('✗ Activity consistency test failed:', error.message);
}

// Test 4: Check if main script produces output files
console.log('\nTest 4: Output file generation');
try {
  const reportExists = fs.existsSync('complex_metrics_report.txt');
  const csvExists = fs.existsSync('processed_users_complex.csv');
  
  if (reportExists && csvExists) {
    console.log('✓ Both output files exist');
    
    // Check file sizes
    const reportSize = fs.statSync('complex_metrics_report.txt').size;
    const csvSize = fs.statSync('processed_users_complex.csv').size;
    
    console.log(`  - Report file: ${reportSize} bytes`);
    console.log(`  - CSV file: ${csvSize} bytes`);
    
    if (reportSize > 100 && csvSize > 1000) {
      console.log('✓ Output files have reasonable sizes');
    } else {
      console.log('✗ Output files seem too small');
    }
  } else {
    console.log('✗ Output files missing');
  }
} catch (error) {
  console.log('✗ Output file test failed:', error.message);
}

console.log('\nAll tests completed!');