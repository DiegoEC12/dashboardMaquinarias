const fs = require("fs");

const archivo = "src/data/mystery-shopping.json";
const s = fs.readFileSync(archivo, "utf8");

const p = s.indexOf('"recomendaciones"');

console.log("================================");
console.log("POSICIÓN:", p);
console.log("================================");

if (p === -1) {
    console.log("No se encontró \"recomendaciones\"");
} else {
    console.log("CONTEXTO ANTERIOR:");
    console.log(s.slice(p - 300, p));

    console.log("\n--- RECOMENDACIONES ---");
    console.log(s.slice(p, p + 300));
}