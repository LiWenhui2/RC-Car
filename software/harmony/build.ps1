param([string]$StudioHome = 'D:/Program Files/DevEco Studio')
$ErrorActionPreference = 'Stop'
$env:DEVECO_STUDIO_HOME = $StudioHome
$env:DEVECO_SDK_HOME = Join-Path $StudioHome 'sdk'
$env:JAVA_HOME = Join-Path $StudioHome 'jbr'
$env:NODE_HOME = Join-Path $StudioHome 'tools/node'
$hNode = Join-Path $StudioHome 'tools/node/node.exe'
$hHvigor = Join-Path $StudioHome 'tools/hvigor/bin/hvigorw.js'
Push-Location $PSScriptRoot
try {
    & $hNode test-protocol.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Protocol tests failed' }
    & $hNode $hHvigor --mode module -p product=default assembleHap --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'Harmony build failed' }
    $hSigned = Join-Path $PSScriptRoot 'entry/build/default/outputs/default/entry-default-signed.hap'
    if (Test-Path -LiteralPath $hSigned) { Write-Output "Signed HAP: $hSigned" }
    else { Write-Output 'Build succeeded; unsigned only. Configure HarmonyOS automatic signing in DevEco before installing.' }
} finally { Pop-Location }
