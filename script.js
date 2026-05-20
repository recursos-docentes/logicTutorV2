let guidedTable = {};

let currentColumn = 0;
let currentRowInColumn = 0;
let currentAnswer = false;
let mistakes = 0;



// =========================
// INSERTAR SÍMBOLOS
// =========================

function insertSymbol(symbol){

    const textarea =
        document.getElementById("formula");

    textarea.value += symbol;

}



// =========================
// VARIABLES
// =========================

function getVariables(expr){

    let vars =
        expr.match(/[a-z]/g);

    if(!vars) return [];

    return [...new Set(vars)].sort();

}

function normalizeFormula(expr){

    expr = expr.trim();

    while(
        expr.startsWith("(") &&
        expr.endsWith(")")
    ){

        let balance = 0;
        let valid = true;

        for(let i=0; i<expr.length-1; i++){

            if(expr[i] === "(") balance++;
            if(expr[i] === ")") balance--;

            if(balance === 0){

                valid = false;
                break;

            }

        }

        if(valid){

            expr =
                expr.slice(1,-1).trim();

        }else{

            break;

        }

    }

    let balance = 0;

    for(let i=0; i<expr.length; i++){

        if(expr[i] === "(") balance++;
        if(expr[i] === ")") balance--;

        if(
            balance === 0 &&
            ["∧","∨","→","↔"]
            .includes(expr[i])
        ){

            return "(" + expr + ")";
        }

    }

    return expr;

}


// =========================
// DEPENDENCIAS DIRECTAS
// =========================

function getDirectDependencies(expr){

    expr = expr.trim();

    while(
        expr.startsWith("(") &&
        expr.endsWith(")")
    ){

        let balance = 0;
        let valid = true;

        for(let i=0; i<expr.length-1; i++){

            if(expr[i] === "(") balance++;
            if(expr[i] === ")") balance--;

            if(balance === 0){

                valid = false;
                break;

            }

        }

        if(valid){

            expr =
                expr.slice(1,-1).trim();

        }else{

            break;

        }

    }

    if(expr.startsWith("¬")){

        let inner =
            expr.slice(1).trim();

        let balance = 0;
        let hasMainOperator = false;

        for(let i=0; i<inner.length; i++){

            if(inner[i] === "(") balance++;
            if(inner[i] === ")") balance--;

            if(
                balance === 0 &&
                ["∧","∨","→","↔"]
                .includes(inner[i])
            ){

                hasMainOperator = true;
                break;

            }

        }

        if(!hasMainOperator){

            return [
                normalizeFormula(inner)
            ];

        }

    }

    let operators =
        ["↔","→","∨","∧"];

    for(let op of operators){

        let balance = 0;

        for(
            let i=expr.length-1;
            i>=0;
            i--
        ){

            if(expr[i] === ")") balance++;
            if(expr[i] === "(") balance--;

            if(
                balance === 0 &&
                expr[i] === op
            ){

                let left =
                    normalizeFormula(
                        expr
                        .slice(0,i)
                        .trim()
                    );

                let right =
                    normalizeFormula(
                        expr
                        .slice(i+1)
                        .trim()
                    );

                return [left,right];

            }

        }

    }

    return [
        normalizeFormula(expr)
    ];

}

// =========================
// EXTRAER SUBFÓRMULAS
// =========================

function extractSubformulas(expr){

    let subformulas = [];

    function recursiveExtract(expression){

        expression = expression.trim();

        while(
            expression.startsWith("(") &&
            expression.endsWith(")")
        ){

            let balance = 0;
            let valid = true;

            for(let i=0; i<expression.length-1; i++){

                if(expression[i] === "(") balance++;
                if(expression[i] === ")") balance--;

                if(balance === 0){

                    valid = false;
                    break;

                }

            }

            if(valid){

                expression =
                    expression.slice(1,-1).trim();

            }else{

                break;

            }

        }

        if(/^[a-z]$/i.test(expression)){

            return;

        }

        if(expression.startsWith("¬")){

            let inner =
                expression.slice(1).trim();

            let balance = 0;
            let hasMainOperator = false;

            for(let i=0; i<inner.length; i++){

                if(inner[i] === "(") balance++;
                if(inner[i] === ")") balance--;

                if(
                    balance === 0 &&
                    ["∧","∨","→","↔"]
                    .includes(inner[i])
                ){

                    hasMainOperator = true;
                    break;

                }

            }

            if(!hasMainOperator){

                recursiveExtract(inner);

                subformulas.push(
                    normalizeFormula(
                        "¬" + inner
                    )
                );

                return;

            }

        }

        let operators =
            ["↔","→","∨","∧"];

        for(let op of operators){

            let balance = 0;

            for(
                let i=expression.length-1;
                i>=0;
                i--
            ){

                if(expression[i] === ")") balance++;
                if(expression[i] === "(") balance--;

                if(
                    balance === 0 &&
                    expression[i] === op
                ){

                    let left =
                        expression
                        .slice(0,i)
                        .trim();

                    let right =
                        expression
                        .slice(i+1)
                        .trim();

                    recursiveExtract(left);
                    recursiveExtract(right);

                    let formula =
                        normalizeFormula(
                            left + op + right
                        );

                    subformulas.push(formula);

                    return;

                }

            }

        }

    }

    recursiveExtract(expr);

    return [...new Set(subformulas)];

}

// =========================
// RESOLVER FÓRMULA
// =========================

function solveSubformula(expr, values){

    expr = expr.trim();

    while(
        expr.startsWith("(") &&
        expr.endsWith(")")
    ){

        let balance = 0;
        let valid = true;

        for(let i=0; i<expr.length-1; i++){

            if(expr[i] === "(") balance++;
            if(expr[i] === ")") balance--;

            if(balance === 0){

                valid = false;
                break;

            }

        }

        if(valid){

            expr =
                expr.slice(1,-1).trim();

        }else{

            break;

        }

    }

    if(/^[a-z]$/i.test(expr)){

        return values[expr];

    }

    if(expr.startsWith("¬")){

        let inner =
            expr.slice(1).trim();

        let balance = 0;
        let hasMainOperator = false;

        for(let i=0; i<inner.length; i++){

            if(inner[i] === "(") balance++;
            if(inner[i] === ")") balance--;

            if(
                balance === 0 &&
                ["∧","∨","→","↔"]
                .includes(inner[i])
            ){

                hasMainOperator = true;
                break;

            }

        }

        if(!hasMainOperator){

            return !solveSubformula(
                inner,
                values
            );

        }

    }

    let operators =
        ["↔","→","∨","∧"];

    for(let op of operators){

        let balance = 0;

        for(
            let i=expr.length-1;
            i>=0;
            i--
        ){

            if(expr[i] === ")") balance++;
            if(expr[i] === "(") balance--;

            if(
                balance === 0 &&
                expr[i] === op
            ){

                let left =
                    expr.slice(0,i).trim();

                let right =
                    expr.slice(i+1).trim();

                let A =
                    solveSubformula(
                        left,
                        values
                    );

                let B =
                    solveSubformula(
                        right,
                        values
                    );

                switch(op){

                    case "∧":
                        return A && B;

                    case "∨":
                        return A || B;

                    case "→":
                        return (!A || B);

                    case "↔":
                        return A === B;

                }

            }

        }

    }

    return false;

}

// =========================
// VALIDAR FÓRMULA
// =========================

function isValidFormula(expr){

    expr = expr.replace(/\s/g,"");

    const validChars =
        /^[pqrs∧∨¬→↔()]+$/i;

    if(expr === "" || /\(\s*\)/.test(expr)){
        return false;
    }

    if(!validChars.test(expr)){
        return false;
    }

    if(
        /^[∧∨→↔]/.test(expr) ||
        /[∧∨¬→↔]$/.test(expr)
    ){
        return false;
    }

    if(/[a-z][a-z]/i.test(expr)){
        return false;
    }

    if(/[a-z](?:[a-z]|¬|\()/i.test(expr)){
        return false;
    }

    if(/[∧∨→↔]{2,}/.test(expr)){
        return false;
    }

    if(/[a-z]¬/i.test(expr)){
        return false;
    }

    if(/[a-z]\(/i.test(expr)){
        return false;
    }

    if(/\)[a-z]/i.test(expr)){
        return false;
    }

    if(/\)¬/.test(expr)){
        return false;
    }

    if(/[∧∨→↔]\)/.test(expr)){
        return false;
    }

    if(/\([∧∨→↔]/.test(expr)){
        return false;
    }

    let balance = 0;

    for(let char of expr){

        if(char === "(") balance++;
        if(char === ")") balance--;

        if(balance < 0){
            return false;
        }

    }

    if(balance !== 0){
        return false;
    }

    return true;

}



// =========================
// INICIAR MODO GUIADO
// =========================

function startGuidedMode(){

    if(operatorGame.active) exitOperatorGame();

    mistakes = 0;
    currentRowInColumn = 0;

    const formula =
        document.getElementById("formula")
        .value
        .trim();

    if(formula === "") return;

    if(!isValidFormula(formula)){
        alert("La fórmula lógica no es válida");
        return;
    }

    const vars =
        getVariables(formula);

    const rowsCount =
        Math.pow(2, vars.length);

    let subformulas =
        extractSubformulas(formula);

    subformulas =
        subformulas.filter(
            f => !/^[a-z]$/i.test(f)
        );

    let columns =
        [...vars, ...subformulas];

    let rows = [];

    for(let i=0; i<rowsCount; i++){

        let row = {};

        vars.forEach((v,index)=>{

            row[v] = !Boolean(
                (i >> (vars.length-index-1)) & 1
            );

        });

        rows.push(row);

    }

    guidedTable = {
        vars,
        columns,
        rows
    };

    currentColumn =
        vars.length;

    renderGuidedTable();
    showColumnQuestion();

}



// =========================
// DIBUJAR TABLA
// =========================

function renderGuidedTable(){

    let currentFormula = "";

    if(
        currentColumn <
        guidedTable.columns.length
    ){
        currentFormula =
            guidedTable.columns[currentColumn];
    }

    let dependencies = [];

    if(currentFormula !== ""){
        dependencies =
            getDirectDependencies(
                currentFormula
            );
    }

    let html = "<table><tr>";

    guidedTable.columns.forEach((col,index)=>{

        let className = "";

        if(
            dependencies.some(
                dep =>
                    normalizeFormula(dep)
                    ===
                    normalizeFormula(col)
            )
        ){
            className += " dependencyColumn";
        }

        if(index === currentColumn){
            className += " currentColumn";
        }

        html += `<th class="${className}">${col}</th>`;

    });

    html += "</tr>";

    guidedTable.rows.forEach((row,rowIndex)=>{

        html += "<tr>";

        guidedTable.columns.forEach((col,index)=>{

            let className = "";

            if(
                dependencies.some(
                    dep =>
                        normalizeFormula(dep)
                        ===
                        normalizeFormula(col)
                )
            ){
                className += " dependencyColumn";
            }

            if(index === currentColumn){
                className += " currentColumn";
            }

            if(rowIndex === currentRowInColumn){

                if(dependencies.includes(col)){
                    className += " activeDependency";
                }

                if(index === currentColumn){
                    className += " activeCurrent";
                }

            }

            let value = row[col];
            let text = "?";

            if(value !== undefined){
                text = value ? "V" : "F";
            }

            html += `<td class="${className}">${text}</td>`;

        });

        html += "</tr>";

    });

    html += "</table>";

    document.getElementById(
        "tableContainer"
    ).innerHTML = html;

}

// =========================
// MOSTRAR PREGUNTA
// =========================

function showColumnQuestion(){

    let formula = guidedTable.columns[currentColumn];
    let row = guidedTable.rows[currentRowInColumn];

    currentAnswer = solveSubformula(formula, row);

    let dependencies = getDirectDependencies(formula);

    document.getElementById("progress").innerHTML = `
        Resolviendo columna: <b>${formula}</b><br>
        Fila ${currentRowInColumn + 1} de ${guidedTable.rows.length}<br><br>
        ❌ Errores: <b>${mistakes}</b>
    `;

    document.getElementById("questionArea").innerHTML = `
        <div class="question">
            <h3>${formula}</h3>
            <div class="variablesRow">
                ${dependencies.map(dep=>`
                    <div class="variableBox">
                        <span class="variableName">${dep}</span>
                        <span class="variableValue ${row[dep] ? 'valueTrue' : 'valueFalse'}">
                            ${row[dep] ? 'V' : 'F'}
                        </span>
                    </div>
                `).join("")}
            </div>
            <div class="answerButtons">
                <button type="button" onclick="checkColumnAnswer(true); return false;">
                    🟩 Verdadero
                </button>
                <button type="button" onclick="checkColumnAnswer(false); return false;">
                    🟦 Falso
                </button>
            </div>
        </div>
    `;

}

// =========================
// VALIDAR RESPUESTA
// =========================

function checkColumnAnswer(answer){

    let feedback =
        document.getElementById("feedback");

    if(answer === currentAnswer){

        feedback.innerHTML = "";

        let formula =
            guidedTable.columns[currentColumn];

        guidedTable.rows[currentRowInColumn][formula]
            = answer;

        renderGuidedTable();

        currentRowInColumn++;

        if(
            currentRowInColumn >=
            guidedTable.rows.length
        ){
            currentRowInColumn = 0;
            currentColumn++;
        }

        if(
            currentColumn >=
            guidedTable.columns.length
        ){

            renderGuidedTable();

            document.getElementById(
                "progress"
            ).innerHTML = "";

            feedback.innerHTML = "";

            document.getElementById(
                "questionArea"
            ).innerHTML = `
            <div class="step">
                🎉 ¡Tabla completada!
                <br><br>
                ❌ Errores cometidos: <b>${mistakes}</b>
            </div>
            `;

            document.getElementById(
                "formula"
            ).value = "";

            return;

        }

        renderGuidedTable();
        showColumnQuestion();

    } else {

        mistakes++;

        let formula =
            guidedTable.columns[currentColumn];

        document.getElementById(
            "progress"
        ).innerHTML = `
            Resolviendo columna: <b>${formula}</b><br>
            Fila ${currentRowInColumn + 1} de ${guidedTable.rows.length}<br><br>
            ❌ Errores: <b>${mistakes}</b>
        `;

        feedback.innerHTML = `
        <div class="feedback wrong">
            ❌ Intenta nuevamente
        </div>
        `;

    }

}

function deleteLastSymbol(){

    const textarea =
        document.getElementById("formula");

    textarea.value =
        textarea.value.slice(0,-1);

}

function clearFormula(){

    document.getElementById(
        "formula"
    ).value = "";

}



// =====================================================
// JUEGO: OPERADOR PRINCIPAL
// =====================================================

const OPERATOR_GAME_CHALLENGES = [
    // Nivel 1 — básico
    { formula: "p∧q",          hint: "Solo hay un operador. ¿Cuál es?", level: 1 },
    { formula: "p∨q",          hint: "Solo hay un operador binario.", level: 1 },
    { formula: "p→q",          hint: "Solo hay un operador binario.", level: 1 },
    { formula: "¬p",           hint: "Solo hay un operador.", level: 1 },
    { formula: "p↔q",          hint: "Solo hay un operador binario.", level: 1 },
    // Nivel 2 — paréntesis simples
    { formula: "¬(p∧q)",       hint: "¿La ¬ afecta solo a p, o a toda la expresión entre paréntesis?", level: 2 },
    { formula: "(p∨q)∧r",      hint: "¿Qué operador conecta los dos grupos principales?", level: 2 },
    { formula: "p→(q∨r)",      hint: "¿El → está dentro o fuera del paréntesis?", level: 2 },
    { formula: "¬p∨q",         hint: "¿La ¬ afecta solo a p, o a toda la fórmula?", level: 2 },
    { formula: "(p→q)↔r",      hint: "¿Qué operador está fuera del paréntesis?", level: 2 },
    // Nivel 3 — avanzado
    { formula: "¬(p→q)",       hint: "¿La ¬ actúa sobre toda la implicación?", level: 3 },
    { formula: "(p∧q)→(r∨s)",  hint: "Hay operadores en ambos grupos. ¿Cuál conecta todo?", level: 3 },
    { formula: "¬p∧¬q",        hint: "Hay dos negaciones. ¿Cuál es el operador principal?", level: 3 },
    { formula: "(p↔q)∧¬r",     hint: "Hay un ∧ y una ¬. ¿Cuál conecta las dos partes?", level: 3 },
    { formula: "¬(p∨q)→r",     hint: "¿El → o la ¬ es el operador principal?", level: 3 },
    { formula: "(p∧¬q)∨r",     hint: "¿El ∨ está dentro o fuera del paréntesis?", level: 3 },
];

let operatorGame = {
    active: false,
    questions: [],
    currentIndex: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    answered: false,
    correctPos: -1,
    currentFormula: ""
};

// ---------------------------
// Utilidades del juego
// ---------------------------

function shuffleArray(arr){
    let a = [...arr];
    for(let i = a.length - 1; i > 0; i--){
        let j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Devuelve el índice (en la cadena original) del operador principal.
function findMainOperatorPosition(formula){

    // Encontrar el rango sin paréntesis externos
    let start = 0;
    let end = formula.length;

    while(start < end){
        if(formula[start] !== "(" || formula[end - 1] !== ")") break;
        let balance = 0;
        let valid = true;
        for(let i = start; i < end - 1; i++){
            if(formula[i] === "(") balance++;
            if(formula[i] === ")") balance--;
            if(balance === 0){ valid = false; break; }
        }
        if(valid){ start++; end--; }
        else break;
    }

    let sub = formula.slice(start, end);

    // Caso negación pura
    if(sub.startsWith("¬")){
        let inner = sub.slice(1);
        let balance = 0;
        let hasBinary = false;
        for(let i = 0; i < inner.length; i++){
            if(inner[i] === "(") balance++;
            if(inner[i] === ")") balance--;
            if(balance === 0 && ["∧","∨","→","↔"].includes(inner[i])){
                hasBinary = true;
                break;
            }
        }
        if(!hasBinary) return start; // ¬ es el principal
    }

    // Buscar operador binario de menor precedencia
    const ops = ["↔","→","∨","∧"];
    for(let op of ops){
        let balance = 0;
        for(let i = sub.length - 1; i >= 0; i--){
            if(sub[i] === ")") balance++;
            if(sub[i] === "(") balance--;
            if(balance === 0 && sub[i] === op) return start + i;
        }
    }

    return -1;
}

// Calcula la profundidad de paréntesis en la posición `pos`.
function getDepthAtPosition(formula, pos){
    let depth = 0;
    for(let i = 0; i < pos; i++){
        if(formula[i] === "(") depth++;
        if(formula[i] === ")") depth--;
    }
    return depth;
}

// Genera la explicación cuando el alumno se equivoca.
function generateWrongExplanation(formula, selectedPos, correctPos){
    let selectedOp = formula[selectedPos];
    let correctOp  = formula[correctPos];
    let depth = getDepthAtPosition(formula, selectedPos);

    // El operador elegido está dentro de paréntesis
    if(depth > 0){
        if(correctOp === "¬"){
            return `El operador <b>${selectedOp}</b> está dentro de paréntesis y se resuelve antes.
                    La <b>¬</b> está fuera y afecta a toda la expresión <b>${formula.slice(correctPos + 1)}</b>,
                    por eso es el operador principal: se evalúa al <b>último</b>.`;
        }
        return `El operador <b>${selectedOp}</b> está dentro de paréntesis, por lo que se resuelve
                <b>antes</b> que el operador principal.
                El operador principal es <b>${correctOp}</b>, que está fuera de los paréntesis
                y conecta las dos partes más grandes de la fórmula.`;
    }

    // Eligió ¬ pero el principal es binario
    if(selectedOp === "¬"){
        let after = formula[selectedPos + 1] === "("
            ? "la subfórmula entre paréntesis"
            : `<b>${formula[selectedPos + 1]}</b>`;
        return `La negación <b>¬</b> tiene alta precedencia y solo afecta a ${after},
                no a toda la fórmula.
                El operador principal es <b>${correctOp}</b>,
                que conecta las dos partes más grandes de la expresión.`;
    }

    // El principal es ¬ pero eligió un binario
    if(correctOp === "¬"){
        return `¡Cuidado! La <b>¬</b> está fuera del paréntesis y afecta a toda la expresión
                <b>${formula.slice(correctPos + 1)}</b>.
                Eso significa que se evalúa al <b>último</b>, por eso es el operador principal.
                El <b>${selectedOp}</b> está dentro del paréntesis y se resuelve antes.`;
    }

    // Ambos binarios al mismo nivel, diferente precedencia
    const precOrder = { "∧": 0, "∨": 1, "→": 2, "↔": 3 };
    if(precOrder[selectedOp] < precOrder[correctOp]){
        return `El operador <b>${selectedOp}</b> tiene mayor precedencia que <b>${correctOp}</b>,
                así que se resuelve antes.
                El operador principal es el de <b>menor</b> precedencia: <b>${correctOp}</b>.<br>
                <small>Orden de precedencia (mayor → menor): ¬ &gt; ∧ &gt; ∨ &gt; → &gt; ↔</small>`;
    }

    return `El operador principal es <b>${correctOp}</b>.
            Recordá: es el que se evalúa al final, el de menor precedencia
            fuera de todos los paréntesis.`;
}

// Genera refuerzo positivo cuando la respuesta es correcta.
function generateCorrectExplanation(formula, correctPos){
    let op = formula[correctPos];
    let depth = getDepthAtPosition(formula, correctPos);
    const names = {
        "∧": "conjunción",
        "∨": "disyunción",
        "→": "implicación",
        "↔": "bicondicional"
    };

    if(op === "¬"){
        return `La <b>¬</b> está fuera del paréntesis y afecta a toda la expresión
                <b>${formula.slice(correctPos + 1)}</b>. Se evalúa al último.`;
    }

    if(depth === 0){
        return `La <b>${op}</b> (${names[op] || ""}) está al nivel más externo
                y conecta las dos partes principales de la fórmula. Se evalúa al final.`;
    }

    return `El operador <b>${op}</b> está fuera de todos los paréntesis: es el operador principal.`;
}

// Construye el HTML de la fórmula con operadores clicables.
function renderClickableFormula(formula){
    const OPS = ["∧","∨","¬","→","↔"];
    let html = "";
    for(let i = 0; i < formula.length; i++){
        let ch = formula[i];
        if(OPS.includes(ch)){
            html += `<span class="clickableOp" data-pos="${i}"
                          onclick="checkOperatorAnswer(${i})">${ch}</span>`;
        } else if(ch === "(" || ch === ")"){
            html += `<span class="gameParen">${ch}</span>`;
        } else {
            html += `<span class="gameVar">${ch}</span>`;
        }
    }
    return html;
}

// ---------------------------
// Flujo del juego
// ---------------------------

function startOperatorGame(){

    // Construir pool de preguntas
    let pool = [...OPERATOR_GAME_CHALLENGES];

    // Incluir la fórmula del textarea si es válida
    let userFormula = document.getElementById("formula").value.trim();
    if(
        userFormula &&
        isValidFormula(userFormula) &&
        !/^[a-z]$/i.test(userFormula) &&
        !pool.some(q => q.formula === userFormula)
    ){
        pool.push({ formula: userFormula, hint: "¡Esta es tu propia fórmula!", level: 2 });
    }

    operatorGame.active    = true;
    operatorGame.questions = shuffleArray(pool);
    operatorGame.currentIndex = 0;
    operatorGame.score     = 0;
    operatorGame.streak    = 0;
    operatorGame.maxStreak = 0;
    operatorGame.answered  = false;

    clearMainAreas();
    renderOperatorGameChallenge();
}

function clearMainAreas(){
    document.getElementById("progress").innerHTML      = "";
    document.getElementById("questionArea").innerHTML  = "";
    document.getElementById("feedback").innerHTML      = "";
    document.getElementById("tableContainer").innerHTML = "";
}

function renderOperatorGameProgress(){
    let q     = operatorGame.questions;
    let idx   = operatorGame.currentIndex;
    let total = q.length;
    let level = idx < total ? (q[idx].level || "?") : "";

    document.getElementById("progress").innerHTML = `
        <div class="gameProgressBar">
            <span class="gpItem">📋 ${idx + 1} / ${total}</span>
            <span class="gpItem gpScore">⭐ ${operatorGame.score} pts</span>
            <span class="gpItem gpStreak">${operatorGame.streak >= 2 ? "🔥 ×" + operatorGame.streak : ""}</span>
            <span class="gpItem gpLevel">Nivel ${level}</span>
            <button class="gpExit" onclick="exitOperatorGame()">✕ Salir</button>
        </div>
    `;
}

function renderOperatorGameChallenge(){

    if(operatorGame.currentIndex >= operatorGame.questions.length){
        showOperatorGameEnd();
        return;
    }

    let q = operatorGame.questions[operatorGame.currentIndex];
    operatorGame.currentFormula = q.formula;
    operatorGame.correctPos     = findMainOperatorPosition(q.formula);
    operatorGame.answered       = false;

    renderOperatorGameProgress();

    document.getElementById("questionArea").innerHTML = `
        <div class="operatorGameCard">
            <div class="ogInstruction">
                Tocá el <b>operador principal</b> de la fórmula:
            </div>
            <div class="ogFormula" id="ogFormula">
                ${renderClickableFormula(q.formula)}
            </div>
            <div class="ogHint">💡 ${q.hint}</div>
        </div>
    `;

    document.getElementById("feedback").innerHTML = "";
}

function checkOperatorAnswer(pos){

    if(operatorGame.answered) return;
    operatorGame.answered = true;

    let formula    = operatorGame.currentFormula;
    let correctPos = operatorGame.correctPos;
    let isCorrect  = (pos === correctPos);

    // Marcar visualmente los operadores
    document.querySelectorAll("#ogFormula .clickableOp").forEach(span => {
        let sp = parseInt(span.getAttribute("data-pos"));
        span.style.pointerEvents = "none";
        if(sp === correctPos) span.classList.add("opCorrect");
        if(sp === pos && !isCorrect) span.classList.add("opWrong");
    });

    if(isCorrect){

        operatorGame.streak++;
        if(operatorGame.streak > operatorGame.maxStreak)
            operatorGame.maxStreak = operatorGame.streak;

        // Bonus por racha: +2 pts cada 3 correctas seguidas
        let bonus  = Math.floor(operatorGame.streak / 3) * 2;
        let points = 10 + bonus;
        operatorGame.score += points;

        let explanation = generateCorrectExplanation(formula, correctPos);
        let streakMsg   = operatorGame.streak >= 3
            ? `<div class="ogStreakMsg">🔥 ¡Racha de ${operatorGame.streak}! +${bonus} extra</div>`
            : "";

        document.getElementById("feedback").innerHTML = `
            <div class="ogFeedback ogCorrect">
                <div class="ogFeedbackTitle">✅ ¡Correcto! <span class="ogPoints">+${points} pts</span></div>
                ${streakMsg}
                <div class="ogExplanation">${explanation}</div>
                <button class="ogNextBtn" onclick="nextOperatorChallenge()">Siguiente →</button>
            </div>
        `;

    } else {

        operatorGame.streak = 0;
        let explanation = generateWrongExplanation(formula, pos, correctPos);

        document.getElementById("feedback").innerHTML = `
            <div class="ogFeedback ogWrong">
                <div class="ogFeedbackTitle">❌ ¡Cuidado!</div>
                <div class="ogExplanation">${explanation}</div>
                <div class="ogWrongBtns">
                    <button class="ogRetryBtn" onclick="retryOperatorChallenge()">↩ Reintentar</button>
                    <button class="ogNextBtn"  onclick="nextOperatorChallenge()">Siguiente →</button>
                </div>
            </div>
        `;

    }

    renderOperatorGameProgress();
}

function retryOperatorChallenge(){
    renderOperatorGameChallenge();
}

function nextOperatorChallenge(){
    operatorGame.currentIndex++;
    renderOperatorGameChallenge();
}

function showOperatorGameEnd(){

    let total   = operatorGame.questions.length;
    let maxPts  = total * 10;
    let pct     = Math.round((operatorGame.score / maxPts) * 100);

    let medal = pct >= 90 ? "🥇" : pct >= 70 ? "🥈" : pct >= 50 ? "🥉" : "💪";
    let msg   = pct >= 90
        ? "¡Dominas el operador principal!"
        : pct >= 70
        ? "¡Muy bien! Seguí practicando."
        : pct >= 50
        ? "Vas por buen camino."
        : "La práctica hace al maestro.";

    document.getElementById("progress").innerHTML = "";

    document.getElementById("questionArea").innerHTML = `
        <div class="ogEndCard">
            <div class="ogEndMedal">${medal}</div>
            <h2 class="ogEndTitle">¡Juego terminado!</h2>
            <p class="ogEndMsg">${msg}</p>
            <div class="ogEndStats">
                <div class="ogStat">
                    <span class="ogStatVal">⭐ ${operatorGame.score}</span>
                    <span class="ogStatLabel">puntos</span>
                </div>
                <div class="ogStat">
                    <span class="ogStatVal">${total}</span>
                    <span class="ogStatLabel">preguntas</span>
                </div>
                <div class="ogStat">
                    <span class="ogStatVal">🔥 ${operatorGame.maxStreak}</span>
                    <span class="ogStatLabel">racha máx.</span>
                </div>
            </div>
            <div class="ogEndBtns">
                <button class="ogNextBtn"  onclick="startOperatorGame()">🔄 Jugar de nuevo</button>
                <button class="ogRetryBtn" onclick="exitOperatorGame()">↩ Volver</button>
            </div>
        </div>
    `;

    document.getElementById("feedback").innerHTML = "";
}

function exitOperatorGame(){
    operatorGame.active = false;
    clearMainAreas();
}



// DEBUG
console.log("Logic Tutor cargado correctamente");
