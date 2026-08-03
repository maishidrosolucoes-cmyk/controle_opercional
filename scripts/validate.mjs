import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "assets/css/styles.css",
  "assets/js/app.js",
  "assets/img/logo-mhs.jpg",
  "assets/img/silhouette.png",
  "assets/img/sector-icons/administrativo.png",
  "assets/img/sector-icons/automacao.png",
  "assets/img/sector-icons/comercial.png",
  "assets/img/sector-icons/compras.png",
  "assets/img/sector-icons/financeiro.png",
  "assets/img/sector-icons/producao.png",
  "assets/img/sector-icons/sala-tecnica.png"
];

const missing = requiredFiles.filter(file => !existsSync(file));
if (missing.length) {
  throw new Error(`Arquivos obrigatórios ausentes:\n${missing.join("\n")}`);
}

const html = readFileSync("index.html", "utf8");
const css = readFileSync("assets/css/styles.css", "utf8");
const js = readFileSync("assets/js/app.js", "utf8");

if (!html.includes("./assets/css/styles.css")) {
  throw new Error("index.html não referencia assets/css/styles.css.");
}

if (!html.includes("./assets/js/app.js")) {
  throw new Error("index.html não referencia assets/js/app.js.");
}

if (!html.includes("./assets/img/logo-mhs.jpg")) {
  throw new Error("index.html não referencia assets/img/logo-mhs.jpg.");
}

new Function(js);

if (/service[_-]?role/i.test(js)) {
  throw new Error("Possível chave service_role encontrada no JavaScript. Não suba isso para o GitHub.");
}

const defaultAnonKey = js.match(/anonKey:\s*"([^"]*)"/);
if (defaultAnonKey?.[1]) {
  throw new Error("A chave anon não deve ficar gravada no código. Use a configuração local do painel.");
}

console.log("Validação concluída: estrutura, assets e JavaScript OK.");
