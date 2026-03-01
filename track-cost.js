#!/usr/bin/env node

/**
 * Herold Cost Tracker
 * Tracks API usage and updates metrics.json
 * Run after completing tasks: node track-cost.js --task "description" --cost 0.05
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const METRICS_FILE = path.join(__dirname, 'metrics.json');

// Rough cost estimates per model (USD per 1K tokens)
const COST_RATES = {
  'moonshot/kimi-k2.5': { input: 0.001, output: 0.003 },
  'openai/gpt-4o': { input: 0.005, output: 0.015 },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'openai/gpt-5.2-codex': { input: 0.01, output: 0.03 }
};

function loadMetrics() {
  try {
    return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
  } catch {
    return {
      totalCost: 0,
      totalCalls: 0,
      tasksCompleted: 0,
      costChange: 0,
      callsChange: 0,
      tasksChange: 0,
      models: [],
      lastUpdated: new Date().toISOString(),
      dailyLog: []
    };
  }
}

function saveMetrics(metrics) {
  metrics.lastUpdated = new Date().toISOString();
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

function estimateCost(model, inputTokens = 2000, outputTokens = 1000) {
  const rates = COST_RATES[model] || COST_RATES['moonshot/kimi-k2.5'];
  return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
}

function trackTask(taskDescription, model = 'moonshot/kimi-k2.5') {
  const metrics = loadMetrics();
  
  // Estimate cost for this task
  const estimatedCost = estimateCost(model);
  
  // Update totals
  metrics.totalCost += estimatedCost;
  metrics.totalCalls += 1;
  metrics.tasksCompleted += 1;
  
  // Log the task
  const logEntry = {
    date: new Date().toISOString(),
    task: taskDescription,
    cost: estimatedCost,
    model: model
  };
  metrics.dailyLog = metrics.dailyLog || [];
  metrics.dailyLog.push(logEntry);
  
  // Keep only last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  metrics.dailyLog = metrics.dailyLog.filter(entry => 
    new Date(entry.date) > thirtyDaysAgo
  );
  
  // Update model breakdown
  const modelEntry = metrics.models.find(m => m.name === model);
  if (modelEntry) {
    modelEntry.cost += estimatedCost;
    modelEntry.calls += 1;
  } else {
    metrics.models.push({
      name: model,
      cost: estimatedCost,
      calls: 1
    });
  }
  
  // Calculate week-over-week change (simplified)
  const weekAgo = metrics.dailyLog.filter(e => {
    const daysDiff = (new Date() - new Date(e.date)) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });
  const prevWeek = metrics.dailyLog.filter(e => {
    const daysDiff = (new Date() - new Date(e.date)) / (1000 * 60 * 60 * 24);
    return daysDiff > 7 && daysDiff <= 14;
  });
  
  const weekCost = weekAgo.reduce((sum, e) => sum + e.cost, 0);
  const prevCost = prevWeek.reduce((sum, e) => sum + e.cost, 0);
  metrics.costChange = prevCost > 0 ? Math.round(((weekCost - prevCost) / prevCost) * 100) : 0;
  metrics.callsChange = weekAgo.length - prevWeek.length;
  metrics.tasksChange = weekAgo.length - prevWeek.length;
  
  saveMetrics(metrics);
  
  // Auto-commit if in git repo
  try {
    execSync('git add metrics.json && git commit -m "Update cost metrics" && git push', {
      cwd: __dirname,
      stdio: 'pipe'
    });
    console.log('✅ Metrics updated and pushed to GitHub');
  } catch (e) {
    console.log('⚠️  Metrics saved locally. Commit manually if needed.');
  }
  
  console.log(`\n📊 Task tracked:`);
  console.log(`   Description: ${taskDescription}`);
  console.log(`   Model: ${model}`);
  console.log(`   Estimated cost: $${estimatedCost.toFixed(4)}`);
  console.log(`   Total cost: $${metrics.totalCost.toFixed(2)}`);
  
  return estimatedCost;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const taskIndex = args.indexOf('--task');
  const modelIndex = args.indexOf('--model');
  
  if (taskIndex === -1 || !args[taskIndex + 1]) {
    console.log('Usage: node track-cost.js --task "description" [--model model-name]');
    console.log('\nExample:');
    console.log('  node track-cost.js --task "Fixed kanban board drag-and-drop" --model "moonshot/kimi-k2.5"');
    process.exit(1);
  }
  
  const task = args[taskIndex + 1];
  const model = modelIndex !== -1 ? args[modelIndex + 1] : 'moonshot/kimi-k2.5';
  
  trackTask(task, model);
}

module.exports = { trackTask, estimateCost, loadMetrics };
