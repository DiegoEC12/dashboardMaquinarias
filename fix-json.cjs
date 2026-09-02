const fs = require("fs");

const input = "src/data/mystery-shopping.json";
const backup = "src/data/mystery-shopping.backup.json";

let json = fs.readFileSync(input, "utf8");

// Crear copia de seguridad
fs.copyFileSync(input, backup);

let result = "";
let insideString = false;
let escaped = false;

for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const code = json.charCodeAt(i);

    // Comillas
    if (char === '"' && !escaped) {
        insideString = !insideString;
        result += char;
        continue;
    }

    // Controlar caracteres escapados
    if (char === "\\" && !escaped) {
        escaped = true;
        result += char;
        continue;
    }

    // Si el carácter estaba escapado, ya terminó la secuencia
    if (escaped) {
        escaped = false;
        result += char;
        continue;
    }

    // Si estamos dentro de un string, corregir caracteres de control
    if (insideString) {
        if (char === "\r") {
            result += "\\r";
            continue;
        }

        if (char === "\n") {
            result += "\\n";
            continue;
        }

        if (char === "\t") {
            result += "\\t";
            continue;
        }

        if (code < 32) {
            result += "\\u" + code.toString(16).padStart(4, "0");
            continue;
        }
    }

    result += char;
}

// Guardar archivo corregido
fs.writeFileSync(input, result, "utf8");

// Comprobar JSON
try {
    const data = JSON.parse(result);

    console.log("");
    console.log("======================================");
    console.log("✅ JSON CORREGIDO CORRECTAMENTE");
    console.log("======================================");
    console.log("Registros:", Array.isArray(data) ? data.length : "Objeto");
    console.log("Archivo:", input);
    console.log("Backup:", backup);
    console.log("");
} catch (error) {
    console.log("");
    console.log("======================================");
    console.log("❌ EL JSON TODAVÍA TIENE UN ERROR");
    console.log("======================================");
    console.log(error.message);
    console.log("");
}