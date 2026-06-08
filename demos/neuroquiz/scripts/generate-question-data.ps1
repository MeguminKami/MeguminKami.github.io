$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $repoRoot 'data'
$outputPath = Join-Path $repoRoot 'js\questions-data.js'

$courseFiles = [ordered]@{
  LCNC = 'questions_LCNC.json'
  MADN = 'questions_MADN.json'
}

$lines = @(
  '// Copia gerada a partir dos ficheiros JSON para permitir que o site funcione ao abrir index.html directamente no browser.'
  '// Executar scripts/generate-question-data.ps1 depois de alterar perguntas.'
  'window.QUESTION_BANKS = {'
)

$courseKeys = @($courseFiles.Keys)
for ($index = 0; $index -lt $courseKeys.Count; $index += 1) {
  $course = $courseKeys[$index]
  $json = Get-Content -Raw -Encoding UTF8 (Join-Path $dataRoot $courseFiles[$course])
  $separator = if ($index -lt $courseKeys.Count - 1) { ',' } else { '' }
  $lines += "  ${course}: $json$separator"
}

$lines += '};'
Set-Content -Path $outputPath -Value ($lines -join "`r`n") -Encoding UTF8
