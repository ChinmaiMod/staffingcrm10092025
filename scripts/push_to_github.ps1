<#
push_to_github.ps1

Usage:
  .\scripts\push_to_github.ps1 -RepoUrl 'https://github.com/youruser/yourrepo.git' -Branch main

This script will:
 - Verify git is available
 - Optionally add a remote named 'origin' if it doesn't exist
 - Push the current branch (or provided branch) to the remote and set upstream

Notes:
 - Make sure you have permission to push to the target repository.
 - If your GitHub uses an access token, set it up in your credential manager or use an HTTPS URL with token embedded (not recommended).
#>

param(
  [Parameter(Mandatory=$true)] [string]$RepoUrl,
  [string]$Branch = 'main',
  [string]$RemoteName = 'origin',
  [string]$UserName = $null,
  [string]$UserEmail = $null
)

function Ensure-Command([string]$cmd) {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if (-not $found) {
    Write-Error "$cmd not found on PATH. Install Git before running this script."
    exit 1
  }
}

Ensure-Command git

$cwd = Get-Location
Write-Output "Preparing to push repository in $cwd to $RepoUrl (branch: $Branch)"

# Check if inside a git repo (use exit code)
git rev-parse --is-inside-work-tree > $null 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Output "No git repo found. Initializing git and committing current files..."
  git init

  if ($UserName) { git config user.name "$UserName" }
  if ($UserEmail) { git config user.email "$UserEmail" }

  git add -A
  git commit -m "Initial commit - push to GitHub"
  if ($LASTEXITCODE -ne 0) { Write-Output "Nothing to commit or commit failed" }

  # Ensure we have a branch name to push
  $currentBranch = git rev-parse --abbrev-ref HEAD
  if (-not $currentBranch -or $currentBranch -eq 'HEAD') {
    git branch -m $Branch
  }
} else {
  Write-Output "Git repository detected."
}

# Check existing remote
$remotes = git remote
if ($remotes -notcontains $RemoteName) {
  Write-Output "Adding remote $RemoteName -> $RepoUrl"
  git remote add $RemoteName $RepoUrl
} else {
  Write-Output "Remote $RemoteName already exists. Setting URL to $RepoUrl"
  git remote set-url $RemoteName $RepoUrl
}

Write-Output "Fetching remote refs..."
git fetch $RemoteName

Write-Output "Pushing branch $Branch to $RemoteName and setting upstream..."
git push -u $RemoteName $Branch

Write-Output "Push complete. Go to GitHub to enable GitHub Actions and add repository secrets for CI/CD."
