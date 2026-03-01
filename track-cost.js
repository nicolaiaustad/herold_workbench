#!/usr/bin/env node

/**
 * Herold Cost Tracker
 * Tracks API usage and updates metrics.json
 * Run after completing tasks: node track-cost.js --task "description" --cost 0.05
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'nicolaiaustad/herold_workbench';

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
  const command = args[0];

  if (command === 'create-issue') {
    const titleIndex = args.indexOf('--title');
    const bodyIndex = args.indexOf('--body');
    const priorityIndex = args.indexOf('--priority');

    if (titleIndex === -1 || !args[titleIndex + 1]) {
      console.log('Usage: node track-cost.js create-issue --title "Issue title" --body "Description" [--priority high|medium|low]');
      process.exit(1);
    }

    const title = args[titleIndex + 1];
    const body = bodyIndex !== -1 ? args[bodyIndex + 1] : null;
    const labels = priorityIndex !== -1 ? [`priority:${args[priorityIndex + 1]}`] : [];

    createIssue(title, body, labels)
      .then(issue => {
        console.log(`✅ Issue created: #${issue.number} - ${issue.title}`);
        console.log(`   URL: ${issue.html_url}`);
      })
      .catch(err => {
        console.error('❌ Failed to create issue:', err.message);
        process.exit(1);
      });
  } else if (command === 'close-issue') {
    const numberIndex = args.indexOf('--number');
    if (numberIndex === -1 || !args[numberIndex + 1]) {
      console.log('Usage: node track-cost.js close-issue --number 123');
      process.exit(1);
    }

    const issueNumber = args[numberIndex + 1];
    closeIssue(issueNumber)
      .then(issue => {
        console.log(`✅ Issue #${issue.number} closed`);
      })
      .catch(err => {
        console.error('❌ Failed to close issue:', err.message);
        process.exit(1);
      });
  } else if (command === 'move-issue') {
    const numberIndex = args.indexOf('--number');
    const statusIndex = args.indexOf('--status');
    const priorityIndex = args.indexOf('--priority');

    if (numberIndex === -1 || !args[numberIndex + 1]) {
      console.log('Usage: node track-cost.js move-issue --number 123 --status todo|inprogress|review [--priority high|medium|low]');
      process.exit(1);
    }

    const issueNumber = args[numberIndex + 1];
    const status = statusIndex !== -1 ? args[statusIndex + 1] : 'todo';
    const priority = priorityIndex !== -1 ? `priority:${args[priorityIndex + 1]}` : null;

    const labels = priority ? [priority] : [];
    if (status !== 'todo') {
      labels.push(`status:${status}`);
    }

    updateIssueLabels(issueNumber, labels)
      .then(issue => {
        console.log(`✅ Issue #${issue.number} updated - Status: ${status}`);
      })
      .catch(err => {
        console.error('❌ Failed to update issue:', err.message);
        process.exit(1);
      });
  } else {
    // Default: track cost
    const taskIndex = args.indexOf('--task');
    const modelIndex = args.indexOf('--model');

    if (taskIndex === -1 || !args[taskIndex + 1]) {
      console.log('Herold Cost Tracker\n');
      console.log('Commands:');
      console.log('  track-cost.js --task "description" [--model model-name]     Track API cost');
      console.log('  track-cost.js create-issue --title "..." [--body "..."] [--priority high|medium|low]');
      console.log('  track-cost.js move-issue --number 123 --status todo|inprogress|review');
      console.log('  track-cost.js close-issue --number 123');
      console.log('\nExamples:');
      console.log('  node track-cost.js --task "Fixed kanban board" --model "moonshot/kimi-k2.5"');
      console.log('  node track-cost.js create-issue --title "New feature" --priority high');
      process.exit(1);
    }

    const task = args[taskIndex + 1];
    const model = modelIndex !== -1 ? args[modelIndex + 1] : 'moonshot/kimi-k2.5';

    trackTask(task, model);
  }
}

// Create a GitHub issue using gh CLI
async function createIssue(title, body, labels = []) {
  try {
    const labelArgs = labels.map(l => `--label "${l}"`).join(' ');
    const bodyArg = body ? `--body "${body}"` : '--body ""';
    const cmd = `gh issue create --title "${title}" ${bodyArg} ${labelArgs}`;
    
    const result = execSync(cmd, {
      cwd: __dirname,
      encoding: 'utf8'
    });
    
    // Extract issue number from URL
    const match = result.match(/issues\/(\d+)/);
    const number = match ? match[1] : null;
    
    return { number, html_url: result.trim() };
  } catch (e) {
    throw new Error(`Failed to create issue: ${e.message}`);
  }
}

// Update issue labels (to move between columns) using gh CLI
async function updateIssueLabels(issueNumber, labels) {
  try {
    // gh doesn't have a direct label edit command, so we use API via gh
    const labelArgs = labels.map(l => `"${l}"`).join(' ');
    const cmd = `gh api repos/${REPO}/issues/${issueNumber} -X PATCH -f labels=${labelArgs}`;
    
    execSync(cmd, {
      cwd: __dirname,
      encoding: 'utf8'
    });
    
    return { number: issueNumber };
  } catch (e) {
    throw new Error(`Failed to update issue: ${e.message}`);
  }
}

// Close an issue using gh CLI
async function closeIssue(issueNumber) {
  try {
    execSync(`gh issue close ${issueNumber}`, {
      cwd: __dirname,
      encoding: 'utf8'
    });
    
    return { number: issueNumber };
  } catch (e) {
    throw new Error(`Failed to close issue: ${e.message}`);
  }
}

module.exports = { trackTask, estimateCost, loadMetrics, createIssue, updateIssueLabels, closeIssue };
