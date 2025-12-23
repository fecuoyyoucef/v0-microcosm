import { Octokit } from "@octokit/rest"

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

const owner = process.env.GITHUB_OWNER!
const repo = process.env.GITHUB_REPO!

// 1️⃣ Repository Analysis
export async function analyzeRepository() {
  const [repoInfo, branches, commits, releases] = await Promise.all([
    octokit.repos.get({ owner, repo }),
    octokit.repos.listBranches({ owner, repo }),
    octokit.repos.listCommits({ owner, repo, per_page: 100 }),
    octokit.repos.listReleases({ owner, repo }),
  ])

  return {
    repository: repoInfo.data,
    branches: branches.data,
    recentCommits: commits.data,
    releases: releases.data,
  }
}

export async function getFileContent(path: string, ref = "main") {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    })

    if ("content" in data) {
      return Buffer.from(data.content, "base64").toString("utf-8")
    }
    return null
  } catch (error) {
    console.error(`Error reading file ${path}:`, error)
    return null
  }
}

export async function searchCodeInRepo(query: string) {
  const { data } = await octokit.search.code({
    q: `${query} repo:${owner}/${repo}`,
  })
  return data.items
}

// 2️⃣ Issues & PRs Management
export async function listIssues(state: "open" | "closed" | "all" = "open") {
  const { data } = await octokit.issues.listForRepo({
    owner,
    repo,
    state,
    per_page: 100,
  })
  return data
}

export async function getIssue(issueNumber: number) {
  const { data } = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  })
  return data
}

export async function createIssueComment(issueNumber: number, body: string) {
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  })
  return data
}

export async function updateIssue(
  issueNumber: number,
  updates: {
    title?: string
    body?: string
    state?: "open" | "closed"
    labels?: string[]
    assignees?: string[]
  },
) {
  const { data } = await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    ...updates,
  })
  return data
}

export async function listPullRequests(state: "open" | "closed" | "all" = "open") {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state,
    per_page: 100,
  })
  return data
}

export async function getPullRequest(prNumber: number) {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  })
  return data
}

export async function createPRComment(prNumber: number, body: string) {
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  })
  return data
}

export async function mergePR(prNumber: number, mergeMethod: "merge" | "squash" | "rebase" = "merge") {
  const { data } = await octokit.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
    merge_method: mergeMethod,
  })
  return data
}

// 3️⃣ Repository Metadata
export async function getRepositoryMetadata() {
  const [collaborators, branches, tags, topics] = await Promise.all([
    octokit.repos.listCollaborators({ owner, repo }),
    octokit.repos.listBranches({ owner, repo }),
    octokit.repos.listTags({ owner, repo }),
    octokit.repos.getAllTopics({ owner, repo }),
  ])

  return {
    collaborators: collaborators.data,
    branches: branches.data,
    tags: tags.data,
    topics: topics.data.names,
  }
}

export async function createWebhook(config: {
  url: string
  events: string[]
  secret?: string
}) {
  const { data } = await octokit.repos.createWebhook({
    owner,
    repo,
    config: {
      url: config.url,
      content_type: "json",
      secret: config.secret,
      insecure_ssl: "0",
    },
    events: config.events,
  })
  return data
}

export async function listWebhooks() {
  const { data } = await octokit.repos.listWebhooks({
    owner,
    repo,
  })
  return data
}

// 4️⃣ Security Monitoring
export async function getSecurityAdvisories() {
  try {
    const { data } = await octokit.repos.listVulnerabilityAlerts({
      owner,
      repo,
    })
    return data
  } catch (error) {
    console.error("Error fetching security advisories:", error)
    return []
  }
}

export async function getCodeScanningAlerts() {
  try {
    const { data } = await octokit.codeScanning.listAlertsForRepo({
      owner,
      repo,
      state: "open",
    })
    return data
  } catch (error) {
    console.error("Error fetching code scanning alerts:", error)
    return []
  }
}

export async function updateCodeScanningAlert(
  alertNumber: number,
  state: "open" | "dismissed",
  dismissedReason?: string,
) {
  const { data } = await octokit.codeScanning.updateAlert({
    owner,
    repo,
    alert_number: alertNumber,
    state,
    dismissed_reason: dismissedReason as any,
  })
  return data
}

// Advanced Analysis
export async function analyzeIssueForCodeLocation(issueBody: string) {
  // Extract file paths or error messages from issue body
  const filePathRegex = /(?:^|\s)([\w-]+\/[\w\-/.]+\.\w+)/g
  const errorRegex = /Error.*at\s+([\w\-/.]+:\d+:\d+)/g

  const filePaths = [...issueBody.matchAll(filePathRegex)].map((m) => m[1])
  const errorLocations = [...issueBody.matchAll(errorRegex)].map((m) => m[1])

  return {
    suspectedFiles: [...new Set([...filePaths, ...errorLocations])],
  }
}

export async function findRelatedCode(keywords: string[]) {
  const results = await Promise.all(keywords.map((keyword) => searchCodeInRepo(keyword)))

  return results.flat()
}
