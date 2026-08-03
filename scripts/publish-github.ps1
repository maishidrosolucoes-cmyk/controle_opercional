$ErrorActionPreference = "Stop"

$repoUrl = "https://github.com/maishidrosolucoes-cmyk/controle_opercional.git"
$commitMessage = "Publica dashboard organizado na raiz"
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$tempRoot = [System.IO.Path]::GetTempPath()
$publishRoot = Join-Path $tempRoot "mhs-controle-opercional-publish"

$paths = @(
  ".editorconfig",
  ".gitattributes",
  ".github/workflows/validate.yml",
  ".gitignore",
  "DOCUMENTACAO_DASHBOARD_MHS_CODEX.md",
  "README.md",
  "assets/css/styles.css",
  "assets/img/logo-mhs.jpg",
  "assets/img/sector-icons/administrativo.png",
  "assets/img/sector-icons/automacao.png",
  "assets/img/sector-icons/comercial.png",
  "assets/img/sector-icons/compras.png",
  "assets/img/sector-icons/financeiro.png",
  "assets/img/sector-icons/producao.png",
  "assets/img/sector-icons/sala-tecnica.png",
  "assets/img/silhouette.png",
  "assets/js/app.js",
  "dashboard_gestao_atividades_mhs_v3.html",
  "index.html",
  "package.json",
  "scripts/publish-github.ps1",
  "scripts/validate.mjs"
)

Push-Location $sourceRoot
try {
  npm.cmd run validate
}
finally {
  Pop-Location
}

if (Test-Path -LiteralPath $publishRoot) {
  $resolvedPublishRoot = (Resolve-Path -LiteralPath $publishRoot).Path
  if (-not $resolvedPublishRoot.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Diretorio temporario inseguro: $resolvedPublishRoot"
  }
  Remove-Item -LiteralPath $resolvedPublishRoot -Recurse -Force
}

git clone $repoUrl $publishRoot

foreach ($path in $paths) {
  $from = Join-Path $sourceRoot $path
  $to = Join-Path $publishRoot $path
  $parent = Split-Path -Parent $to

  if (-not (Test-Path -LiteralPath $from)) {
    throw "Arquivo obrigatorio ausente: $path"
  }

  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }

  Copy-Item -LiteralPath $from -Destination $to -Force
}

git -C $publishRoot add -- $paths

$staged = git -C $publishRoot diff --cached --name-only
if (-not $staged) {
  Write-Host "Nenhuma alteracao para publicar."
  exit 0
}

git -C $publishRoot commit -m $commitMessage
git -C $publishRoot push origin main

Write-Host "Publicado com sucesso em $repoUrl"
