param(
  [int]$MainPort = 3000,
  [int]$ImagePort = 3001,
  [int]$VideoPort = 3002
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$node = (Get-Command node.exe -ErrorAction Stop).Source

$targets = @(
  @{ Name = 'main'; Path = $root; Port = $MainPort },
  @{ Name = 'ai-image'; Path = (Join-Path $root 'Jevailab-ai-image'); Port = $ImagePort },
  @{ Name = 'ai-video'; Path = (Join-Path $root 'Jevailab-ai-video'); Port = $VideoPort }
)

$started = @()

try {
  foreach ($target in $targets) {
    if (-not (Test-Path -LiteralPath $target.Path -PathType Container)) {
      throw "Missing worktree: $($target.Path)"
    }

    $listener = Get-NetTCPConnection -State Listen -LocalPort $target.Port -ErrorAction SilentlyContinue
    if ($listener) {
      throw "Port $($target.Port) is already in use; stop the existing server first."
    }

    $vite = Join-Path $target.Path 'node_modules\vite\bin\vite.js'
    if (-not (Test-Path -LiteralPath $vite -PathType Leaf)) {
      throw "Missing Vite in $($target.Path). Run pnpm install there first."
    }

    $arguments = @(
      $vite, 'dev',
      '--host', '127.0.0.1',
      '--port', $target.Port
    )

    $process = Start-Process `
      -FilePath $node `
      -ArgumentList $arguments `
      -WorkingDirectory $target.Path `
      -WindowStyle Hidden `
      -PassThru

    $started += [pscustomobject]@{
      Name = $target.Name
      Port = $target.Port
      Url = "http://127.0.0.1:$($target.Port)/"
      Process = $process
    }
  }

  Write-Host ''
  Write-Host 'Jevailab previews:'
  foreach ($server in $started) {
    Write-Host ("  {0,-8} {1}" -f $server.Name, $server.Url)
  }
  Write-Host ''
  Write-Host 'First startup can take 30-60 seconds.'
  Write-Host 'Press Ctrl+C to stop all three servers.'

  while ($true) {
    $exited = $false
    foreach ($server in $started) {
      if ($server.Process.HasExited) {
        Write-Error "$($server.Name) exited with code $($server.Process.ExitCode)."
        $exited = $true
        break
      }
    }
    if ($exited) {
      exit 1
    }
    Start-Sleep -Seconds 1
  }
}
finally {
  foreach ($server in $started) {
    # Stop only processes still using this preview's port.
    $listener = Get-NetTCPConnection `
      -State Listen `
      -LocalPort $server.Port `
      -ErrorAction SilentlyContinue
    if ($listener) {
      Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    if (-not $server.Process.HasExited) {
      Stop-Process -Id $server.Process.Id -Force -ErrorAction SilentlyContinue
    }
  }
}
