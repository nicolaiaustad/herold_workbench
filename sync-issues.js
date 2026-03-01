#!/usr/bin/env node

/**
 * Herold Issues Sync
 * Fetches GitHub issues and saves to issues.json for dashboard
 * Run via cron or GitHub Action
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'nicolaiaustad/herold_workbench';
const ISSUES_FILE = path.join(__dirname, 'issues.json');

function syncIssues() {
  try {
    console.log('🔄 Fetching issues from GitHub...');
    
    // Fetch all issues (open and closed)
    const result = execSync(`gh issue list --repo ${REPO} --state all --json number,title,body,state,labels,url,createdAt,updatedAt`, {
      encoding: 'utf8',
      cwd: __dirname
    });
    
    const issues = JSON.parse(result);
    
    // Transform to dashboard format
    const tasks = issues.map(issue => {
      const labels = issue.labels.map(l => l.name.toLowerCase());
      
      let priority = 'medium';
      if (labels.includes('priority:high') || labels.includes('high')) priority = 'high';
      if (labels.includes('priority:low') || labels.includes('low')) priority = 'low';
      
      let status = 'todo';
      if (issue.state === 'closed') {
        status = 'done';
      } else if (labels.includes('status:inprogress') || labels.includes('inprogress')) {
        status = 'inprogress';
      } else if (labels.includes('status:review') || labels.includes('review')) {
        status = 'review';
      }
      
      return {
        id: issue.number.toString(),
        title: issue.title,
        description: issue.body || '',
        priority,
        status,
        url: issue.html_url,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt
      };
    });
    
    const data = {
      tasks,
      lastUpdated: new Date().toISOString(),
      totalCount: tasks.length
    };
    
    fs.writeFileSync(ISSUES_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Synced ${tasks.length} issues to issues.json`);
    
    // Auto-commit if there are changes
    try {
      execSync('git add issues.json && git diff --cached --quiet || (git commit -m "Sync issues from GitHub" && git push)', {
        cwd: __dirname,
        stdio: 'pipe'
      });
      console.log('✅ Changes pushed to GitHub');
    } catch (e) {
      // No changes to commit
    }
    
    return tasks;
  } catch (e) {
    console.error('❌ Failed to sync issues:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  syncIssues();
}

module.exports = { syncIssues };
