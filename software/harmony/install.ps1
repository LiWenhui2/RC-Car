param(
    [string]$StudioHome = 'D:/Program Files/DevEco Studio',
    [string]$DeviceId = '4UQ9K25620001475'
)
$ErrorActionPreference = 'Stop'
$hSigned = Join-Path $PSScriptRoot 'entry/build/default/outputs/default/entry-default-signed.hap'
if (-not (Test-Path -LiteralPath $hSigned)) {
    throw 'No signed HAP. Complete HarmonyOS automatic signing in DevEco and run build.ps1 first.'
}
$hHdc = Join-Path $StudioHome 'sdk/default/openharmony/toolchains/hdc.exe'
& $hHdc -t $DeviceId install -r $hSigned
if ($LASTEXITCODE -ne 0) { throw 'HDC installation failed' }
& $hHdc -t $DeviceId shell aa start -a EntryAbility -b com.vonphy.car
if ($LASTEXITCODE -ne 0) { throw 'Unable to launch EntryAbility' }
