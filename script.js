let guidedTable = {};

let currentColumn = 0;
let currentRowInColumn = 0;
let currentAnswer = false;
let mistakes = 0;
let guidedScore = 0;
let guidedStreak = 0;
let guidedMaxStreak = 0;
let guidedFreeMode = false;
let freeCellSelected = false;

// ── State machine ──────────────────────────────────────
const gameState = {
    phase:      'idle',          // 'idle' | 'operator' | 'decomposition' | 'table_solving'
    formula:    '',
    solveLevel: 'principiante'   // 'principiante' | 'asistido'
};

// ── Smart Fill ─────────────────────────────────────────
let autoCompletedCells  = new Set(); // "colIdx,rowIdx"
let manualCellsInColumn = 0;

// ── Decomposition state ────────────────────────────────
let decompositionState = {
    formula:        '',
    subformulas:    [],
    currentOptions: [],
    currentIndex:   0,
    score:          0,
    mistakes:       0
};



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
    guidedScore = 0;
    guidedStreak = 0;
    guidedMaxStreak = 0;
    guidedFreeMode = false;
    freeCellSelected = false;
    currentRowInColumn = 0;
    autoCompletedCells  = new Set();
    manualCellsInColumn = 0;

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
    let dependencies   = [];

    if(currentColumn >= 0 && currentColumn < guidedTable.columns.length){
        currentFormula = guidedTable.columns[currentColumn];
    }

    if(currentFormula !== "" && !guidedFreeMode){
        dependencies = getDirectDependencies(currentFormula);
    }

    let html = "<table><tr>";

    guidedTable.columns.forEach((col, index) => {
        let className = "";

        if(!guidedFreeMode){
            if(dependencies.some(dep => normalizeFormula(dep) === normalizeFormula(col))){
                className += " dependencyColumn";
            }
            if(index === currentColumn) className += " currentColumn";
        }

        html += `<th class="${className}">${col}</th>`;
    });

    html += "</tr>";

    guidedTable.rows.forEach((row, rowIndex) => {

        html += "<tr>";

        guidedTable.columns.forEach((col, colIndex) => {

            let value     = row[col];
            let className = "";
            let text      = "";
            let extra     = "";

            if(guidedFreeMode){

                // Celda actualmente seleccionada
                if(freeCellSelected && colIndex === currentColumn && rowIndex === currentRowInColumn){
                    className += " activeCurrent";
                }

                if(value !== undefined){
                    text       = value ? "V" : "F";
                    className += value ? " cellTrue" : " cellFalse";
                } else if(colIndex < guidedTable.vars.length){
                    text = "?";
                } else if(isCellReady(colIndex, rowIndex)){
                    text       = "?";
                    className += " freeCell";
                    extra      = `onclick="selectFreeCell(${colIndex},${rowIndex})"`;
                } else {
                    text       = "🔒";
                    className += " lockedCell";
                }

            } else {

                if(dependencies.some(dep => normalizeFormula(dep) === normalizeFormula(col))){
                    className += " dependencyColumn";
                }
                if(colIndex === currentColumn) className += " currentColumn";

                if(rowIndex === currentRowInColumn){
                    if(dependencies.includes(col))    className += " activeDependency";
                    if(colIndex === currentColumn)     className += " activeCurrent";
                }

                if(autoCompletedCells.has(colIndex + ',' + rowIndex)) className += ' auto-completado';

                text = value !== undefined ? (value ? "V" : "F") : "?";
            }

            html += `<td class="${className}" ${extra}>${text}</td>`;
        });

        html += "</tr>";
    });

    html += "</table>";

    document.getElementById("tableContainer").innerHTML = html;

}

// =========================
// MOSTRAR PREGUNTA
// =========================

function showColumnQuestion(){

    let formula = guidedTable.columns[currentColumn];
    let row = guidedTable.rows[currentRowInColumn];

    currentAnswer = solveSubformula(formula, row);

    let dependencies = getDirectDependencies(formula);

    updateGuidedProgress();

    document.getElementById("feedback").innerHTML = "";

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
            <div class="answerButtons" id="guidedAnswerBtns">
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

    let feedback = document.getElementById("feedback");
    let formula  = guidedTable.columns[currentColumn];
    let row      = guidedTable.rows[currentRowInColumn];

    if(answer === currentAnswer){

        // Guardar respuesta y actualizar tabla
        guidedTable.rows[currentRowInColumn][formula] = answer;
        renderGuidedTable();
        manualCellsInColumn++;

        // Puntaje
        guidedStreak++;
        if(guidedStreak > guidedMaxStreak) guidedMaxStreak = guidedStreak;
        let bonus  = Math.floor(guidedStreak / 3) * 2;
        let points = 10 + bonus;
        guidedScore += points;

        // Deshabilitar botones V/F
        let btns = document.getElementById("guidedAnswerBtns");
        if(btns) btns.style.display = "none";

        let explanation = generateTableFeedback(formula, row);
        let streakMsg   = guidedStreak >= 3
            ? `<div class="ogStreakMsg">🔥 ¡Racha de ${guidedStreak}! +${bonus} extra</div>`
            : "";

        let smartFillBtn = checkSmartFillEligibility()
            ? `<button class="smartFillBtn" onclick="verificarYAutocompletar(); return false;">🤖 Autocompletar restantes</button>`
            : "";

        feedback.innerHTML = `
            <div class="ogFeedback ogCorrect">
                <div class="ogFeedbackTitle">✅ ¡Correcto! <span class="ogPoints">+${points} pts</span></div>
                ${streakMsg}
                <div class="ogExplanation">${explanation}</div>
                <div class="ogAnswerActions">
                    <button class="ogNextBtn" onclick="advanceGuidedMode(); return false;">Continuar →</button>
                    ${smartFillBtn}
                </div>
            </div>
        `;

        updateGuidedProgress();

    } else {

        guidedStreak = 0;
        mistakes++;

        let explanation = generateTableFeedback(formula, row);

        feedback.innerHTML = `
            <div class="ogFeedback ogWrong">
                <div class="ogFeedbackTitle">❌ No es correcto</div>
                <div class="ogExplanation">${explanation}</div>
            </div>
        `;

        updateGuidedProgress();

    }

}

function advanceGuidedMode(){

    document.getElementById("feedback").innerHTML = "";

    if(guidedFreeMode){
        advanceFreeMode();
        return;
    }

    currentRowInColumn++;

    if(currentRowInColumn >= guidedTable.rows.length){
        currentRowInColumn   = 0;
        currentColumn++;
        manualCellsInColumn  = 0;
    }

    if(currentColumn >= guidedTable.columns.length){
        showGuidedEnd();
        return;
    }

    renderGuidedTable();
    showColumnQuestion();

}

function showGuidedEnd(){
    renderGuidedTable();
    document.getElementById("progress").innerHTML = "";

    let medal = mistakes === 0 ? "🥇"
              : mistakes <= 2 ? "🥈"
              : mistakes <= 5 ? "🥉"
              : "💪";
    let msg = mistakes === 0 ? "¡Perfecto, sin ningún error!"
            : mistakes <= 2 ? "¡Muy bien, casi perfecto!"
            : mistakes <= 5 ? "Bien. Seguí practicando."
            : "La práctica hace al maestro.";

    document.getElementById("questionArea").innerHTML = `
        <div class="ogEndCard">
            <div class="ogEndMedal">${medal}</div>
            <h2 class="ogEndTitle">🎉 ¡Tabla completada!</h2>
            <p class="ogEndMsg">${msg}</p>
            <div class="ogEndStats">
                <div class="ogStat">
                    <span class="ogStatVal">⭐ ${guidedScore}</span>
                    <span class="ogStatLabel">puntos</span>
                </div>
                <div class="ogStat">
                    <span class="ogStatVal">❌ ${mistakes}</span>
                    <span class="ogStatLabel">errores</span>
                </div>
                <div class="ogStat">
                    <span class="ogStatVal">🔥 ${guidedMaxStreak}</span>
                    <span class="ogStatLabel">racha máx.</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById("formula").value = "";
}

function updateGuidedProgress(){
    if(guidedFreeMode){
        updateFreeModeProgress();
        return;
    }

    let formula   = (currentColumn >= 0 && currentColumn < guidedTable.columns.length)
        ? guidedTable.columns[currentColumn] : "";
    let totalRows = guidedTable.rows ? guidedTable.rows.length : 0;

    document.getElementById("progress").innerHTML = `
        <div class="gameProgressBar">
            <span class="gpItem">📋 <b>${formula}</b></span>
            <span class="gpItem">Fila ${currentRowInColumn + 1}/${totalRows}</span>
            <span class="gpItem gpScore">⭐ ${guidedScore} pts</span>
            <span class="gpItem gpStreak">${guidedStreak >= 2 ? "🔥 ×" + guidedStreak : ""}</span>
            <span class="gpItem">❌ ${mistakes}</span>
        </div>
    `;
}

function getMainOperatorChar(formula){
    let pos = findMainOperatorPosition(formula);
    return pos >= 0 ? formula[pos] : null;
}

function generateTableFeedback(formula, row){

    let correctVal = solveSubformula(formula, row);
    let correctStr = correctVal ? "V" : "F";
    let op   = getMainOperatorChar(formula);
    let deps = getDirectDependencies(formula);

    // Negación
    if(op === "¬" && deps.length === 1){
        let inner    = deps[0];
        let innerVal = row[inner] !== undefined
            ? row[inner]
            : solveSubformula(inner, row);
        let innerStr = innerVal ? "V" : "F";
        return `La <b>negación</b> invierte el valor:
                <b>${inner}</b>&nbsp;=&nbsp;${innerStr}
                &nbsp;→&nbsp;
                <b>¬${inner}</b>&nbsp;=&nbsp;<b>${correctStr}</b>.`;
    }

    // Operadores binarios
    if(deps.length === 2){
        let [left, right] = deps;
        let leftVal  = row[left]  !== undefined ? row[left]  : solveSubformula(left,  row);
        let rightVal = row[right] !== undefined ? row[right] : solveSubformula(right, row);
        let lStr = leftVal  ? "V" : "F";
        let rStr = rightVal ? "V" : "F";

        switch(op){
            case "∧":
                if(!correctVal){
                    let who = !leftVal && !rightVal
                        ? "ninguna parte es V"
                        : !leftVal
                            ? `<b>${left}</b>&nbsp;=&nbsp;F`
                            : `<b>${right}</b>&nbsp;=&nbsp;F`;
                    return `La <b>conjunción</b> (∧) es Falsa porque ${who}.
                            Para ser V, <b>ambas</b> partes deben ser V.`;
                } else {
                    return `La <b>conjunción</b> (∧) es Verdadera porque ambas partes son V:
                            <b>${left}</b>&nbsp;=&nbsp;V y <b>${right}</b>&nbsp;=&nbsp;V.`;
                }

            case "∨":
                if(correctVal){
                    let who = leftVal && rightVal
                        ? "ambas partes son V"
                        : leftVal
                            ? `<b>${left}</b>&nbsp;=&nbsp;V`
                            : `<b>${right}</b>&nbsp;=&nbsp;V`;
                    return `La <b>disyunción</b> (∨) es Verdadera porque ${who}.
                            Solo es F cuando <b>ambas</b> son F.`;
                } else {
                    return `La <b>disyunción</b> (∨) es Falsa porque ambas partes son F:
                            <b>${left}</b>&nbsp;=&nbsp;F y <b>${right}</b>&nbsp;=&nbsp;F.`;
                }

            case "→":
                if(!correctVal){
                    return `La <b>implicación</b> (→) es Falsa <b>solo</b> cuando
                            el antecedente es V y el consecuente es F.
                            Aquí <b>${left}</b>&nbsp;=&nbsp;V y <b>${right}</b>&nbsp;=&nbsp;F.`;
                } else {
                    if(!leftVal){
                        return `La <b>implicación</b> (→) es Verdadera porque
                                el antecedente <b>${left}</b>&nbsp;=&nbsp;F.
                                Una implicación con antecedente Falso <b>siempre</b> es Verdadera.`;
                    } else {
                        return `La <b>implicación</b> (→) es Verdadera porque
                                el consecuente <b>${right}</b>&nbsp;=&nbsp;V.`;
                    }
                }

            case "↔":
                if(correctVal){
                    return `El <b>bicondicional</b> (↔) es Verdadero porque ambas partes
                            tienen el <b>mismo</b> valor:
                            <b>${left}</b>&nbsp;=&nbsp;${lStr} y <b>${right}</b>&nbsp;=&nbsp;${rStr}.`;
                } else {
                    return `El <b>bicondicional</b> (↔) es Falso porque las partes
                            tienen valores <b>distintos</b>:
                            <b>${left}</b>&nbsp;=&nbsp;${lStr} y <b>${right}</b>&nbsp;=&nbsp;${rStr}.`;
                }
        }
    }

    return `El valor correcto es <b>${correctStr}</b>.`;
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
// MODO AUTOEVALUACIÓN (libre)
// =====================================================

function startFreeMode(){
    if(operatorGame.active) exitOperatorGame();

    const formula = document.getElementById("formula").value.trim();
    if(formula === "") return;
    if(!isValidFormula(formula)){
        alert("La fórmula lógica no es válida");
        return;
    }

    const vars      = getVariables(formula);
    const rowsCount = Math.pow(2, vars.length);

    let subformulas = extractSubformulas(formula).filter(f => !/^[a-z]$/i.test(f));
    let columns     = [...vars, ...subformulas];
    let rows        = [];

    for(let i = 0; i < rowsCount; i++){
        let row = {};
        vars.forEach((v, idx) => {
            row[v] = !Boolean((i >> (vars.length - idx - 1)) & 1);
        });
        rows.push(row);
    }

    guidedTable      = { vars, columns, rows };
    guidedFreeMode   = true;
    freeCellSelected = false;
    mistakes         = 0;
    guidedScore      = 0;
    guidedStreak     = 0;
    guidedMaxStreak  = 0;
    currentColumn    = -1;
    currentRowInColumn = -1;

    clearMainAreas();

    renderGuidedTable();
    updateFreeModeProgress();

    document.getElementById("questionArea").innerHTML = `
        <div class="freeModeHint">
            Hacé clic en cualquier celda <b>?</b> para resolverla.<br>
            Las celdas 🔒 requieren resolver antes sus dependencias.
        </div>
    `;
}

function isCellReady(colIndex, rowIndex){
    let col = guidedTable.columns[colIndex];
    let row = guidedTable.rows[rowIndex];
    if(row[col] !== undefined) return false;
    let deps = getDirectDependencies(col);
    return deps.every(dep => row[dep] !== undefined);
}

function selectFreeCell(colIndex, rowIndex){
    if(freeCellSelected) return;
    currentColumn      = colIndex;
    currentRowInColumn = rowIndex;
    freeCellSelected   = true;
    renderGuidedTable();
    showColumnQuestion();
}

function advanceFreeMode(){
    freeCellSelected   = false;
    currentColumn      = -1;
    currentRowInColumn = -1;

    let subCols = guidedTable.columns.slice(guidedTable.vars.length);
    let allDone = subCols.every(col =>
        guidedTable.rows.every(row => row[col] !== undefined)
    );

    if(allDone){
        guidedFreeMode = false;
        showGuidedEnd();
        return;
    }

    renderGuidedTable();
    updateFreeModeProgress();

    document.getElementById("questionArea").innerHTML = `
        <div class="freeModeHint">✅ ¡Correcto! Elegí otra celda <b>?</b> para continuar.</div>
    `;
}

function updateFreeModeProgress(){
    let subCols = guidedTable.columns.slice(guidedTable.vars.length);
    let total   = subCols.length * guidedTable.rows.length;
    let done    = subCols.reduce((acc, col) =>
        acc + guidedTable.rows.filter(row => row[col] !== undefined).length, 0);

    document.getElementById("progress").innerHTML = `
        <div class="gameProgressBar">
            <span class="gpItem">✏️ <b>Autoevaluación</b></span>
            <span class="gpItem">📋 ${done}/${total} celdas</span>
            <span class="gpItem gpScore">⭐ ${guidedScore} pts</span>
            <span class="gpItem gpStreak">${guidedStreak >= 2 ? "🔥 ×" + guidedStreak : ""}</span>
            <span class="gpItem">❌ ${mistakes}</span>
        </div>
    `;
}

// =====================================================
// MODAL DE AYUDA
// =====================================================

function toggleHelpModal(){
    let modal = document.getElementById("helpModal");
    if(modal.classList.contains("helpVisible")){
        modal.classList.remove("helpVisible");
        return;
    }
    document.getElementById("helpModalBody").innerHTML = buildHelpContent();
    modal.classList.add("helpVisible");
}

function closeHelpModal(e){
    if(e.target === document.getElementById("helpModal")){
        document.getElementById("helpModal").classList.remove("helpVisible");
    }
}

// Filas de cada operador dentro de conectivas.png (top%, height%)
// Calibradas para imagen 1359×1157px. Ajustar si la imagen cambia.
const CONECTIVAS_ROWS = {
    '¬': [19, 16],
    '∧': [33, 16],
    '∨': [47, 16],
    '→': [61, 16],
    '↔': [75, 15]
};

function buildHelpContent(){
    let currentOp      = null;
    let currentFormula = '';

    if(guidedTable.columns && currentColumn >= 0 && currentColumn < guidedTable.columns.length){
        currentFormula = guidedTable.columns[currentColumn];
        currentOp      = getMainOperatorChar(currentFormula);
    }

    // Spotlight overlay sobre la fila del operador activo
    let overlayHtml = '';
    if(currentOp && CONECTIVAS_ROWS[currentOp]){
        let [top, h] = CONECTIVAS_ROWS[currentOp];
        overlayHtml = `<div class="helpOverlay" style="top:${top}%;height:${h}%" aria-hidden="true"></div>`;
    }

    // Tarjeta de contexto: qué está resolviendo ahora mismo
    const opNames = {'¬':'Negación','∧':'Conjunción','∨':'Disyunción','→':'Implicación','↔':'Bicondicional'};
    let contextCard = '';
    if(currentOp){
        contextCard = `
            <div class="helpContext">
                Resolviendo: <b>${currentFormula}</b><br>
                Operador principal: <b>${currentOp}</b> — ${opNames[currentOp] || ''}
            </div>
        `;
    }

    // Tabla de verdad suplementaria: solo el operador activo (o todas si no hay contexto)
    let detailHtml = currentOp
        ? `<div class="helpDivider">── Tabla de verdad ──</div>
           <div class="helpHighlightCard">${getOperatorHelpHTML(currentOp)}</div>`
        : `<div class="helpDivider">── Referencia completa ──</div>
           ${["¬","∧","∨","→","↔"].map(op =>
               `<div class="helpOpCard">${getOperatorHelpHTML(op)}</div>`
           ).join('')}`;

    return `
        ${contextCard}
        <div class="helpImageWrapper">
            <img src="conectivas.png"
                 alt="Tabla de conectivas lógicas"
                 class="helpConnectivesImg" />
            ${overlayHtml}
        </div>
        ${detailHtml}
    `;
}

function getOperatorHelpHTML(op){
    const data = {
        "¬": { name:"Negación",      rule:"Invierte el valor.",
               cols:["p","¬p"],
               rows:[["V","F"],["F","V"]] },
        "∧": { name:"Conjunción",    rule:"Solo V cuando <b>ambas</b> son V.",
               cols:["p","q","p∧q"],
               rows:[["V","V","V"],["V","F","F"],["F","V","F"],["F","F","F"]] },
        "∨": { name:"Disyunción",    rule:"Solo F cuando <b>ambas</b> son F.",
               cols:["p","q","p∨q"],
               rows:[["V","V","V"],["V","F","V"],["F","V","V"],["F","F","F"]] },
        "→": { name:"Implicación",   rule:"Solo F cuando p=V <b>y</b> q=F.",
               cols:["p","q","p→q"],
               rows:[["V","V","V"],["V","F","F"],["F","V","V"],["F","F","V"]] },
        "↔": { name:"Bicondicional", rule:"V cuando ambas tienen el <b>mismo</b> valor.",
               cols:["p","q","p↔q"],
               rows:[["V","V","V"],["V","F","F"],["F","V","F"],["F","F","V"]] }
    };
    let d = data[op];
    if(!d) return "";

    let html = `<div class="helpOpTitle">${op} — ${d.name}</div>`;
    html    += `<div class="helpOpRule">💡 ${d.rule}</div>`;
    html    += `<table class="helpTable"><tr>${d.cols.map(c=>`<th>${c}</th>`).join("")}</tr>`;
    d.rows.forEach(r => {
        html += `<tr>${r.map((cell,i) => {
            let last = i === r.length - 1;
            let cl   = last ? (cell==="V" ? "helpTrue" : "helpFalse") : "";
            return `<td class="${cl}">${cell}</td>`;
        }).join("")}</tr>`;
    });
    html += `</table>`;
    return html;
}

// =====================================================
// JUEGO: OPERADOR PRINCIPAL
// =====================================================

const OPERATOR_GAME_CHALLENGES = [
 
    // Nivel 1 — paréntesis simples
    { formula: "¬(p∧q)",       hint: "¿La ¬ afecta solo a p, o a toda la expresión entre paréntesis?", level: 1 },
    { formula: "(p∨q)∧r",      hint: "¿Qué operador conecta los dos grupos principales?", level: 1 },
    { formula: "p→(q∨r)",      hint: "¿El → está dentro o fuera del paréntesis?", level: 1 },
    { formula: "¬p∨q",         hint: "¿La ¬ afecta solo a p, o a toda la fórmula?", level: 1 },
    { formula: "(p→q)↔r",      hint: "¿Qué operador está fuera del paréntesis?", level: 1 },
    // Nivel 2 — avanzado
    { formula: "¬(p→q)",       hint: "¿La ¬ actúa sobre toda la implicación?", level: 2 },
    { formula: "(p∧q)→(r∨s)",  hint: "Hay operadores en ambos grupos. ¿Cuál conecta todo?", level: 2 },
    { formula: "¬p∧¬q",        hint: "Hay dos negaciones. ¿Cuál es el operador principal?", level: 2 },
    { formula: "(p↔q)∧¬r",     hint: "Hay un ∧ y una ¬. ¿Cuál conecta las dos partes?", level: 2 },
    { formula: "¬(p∨q)→r",     hint: "¿El → o la ¬ es el operador principal?", level: 2 },
    { formula: "(p∧¬q)∨r",     hint: "¿El ∨ está dentro o fuera del paréntesis?", level: 2 },
    // Nivel 3 — Desafío total (anidamientos y negaciones complejas)
    { formula: "¬[(p→q)∧(r∨s)]", hint: "Mirá el corchete completo. ¿Hay algún operador que afecte a absolutamente todo lo que está adentro?", level: 3 },
    { formula: "[(p∧q)→r]↔(¬s∨t)", hint: "Tenemos dos bloques grandes entre corchetes y paréntesis. ¿Qué conector une esos dos bloques principales?", level: 3 },
    { formula: "¬(p→¬q)∧(r↔¬s)", hint: "Tenés una conjunción (∧) en el medio. ¿Las negaciones de los extremos afectan a toda la fórmula o solo a sus bloques?", level: 3 },
    { formula: "p→[q∨(r∧¬s)]", hint: "El condicional está al principio. ¿Todo lo demás está agrupado dentro del corchete?", level: 3 },
    { formula: "¬{[(p∧q)→r]∨s}", hint: "Fijate en las llaves externas. ¿Qué operador está modificando a toda la estructura molecular?", level: 3 },
    { formula: "[(p↔q)∧¬r]→(s∧¬t)", hint: "Identificá las dos premisas mayores. ¿Cuál es el operador que establece la relación de causa y efecto entre ellas?", level: 3 },
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

    gameState.phase   = 'operator';
    gameState.formula = (userFormula && isValidFormula(userFormula) && !/^[a-z]$/i.test(userFormula))
        ? userFormula : '';

    operatorGame.active    = true;
    operatorGame.questions = shuffleArray(pool).slice(0, 5);
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

    let decompBtn = gameState.formula
        ? `<button class="ogNextBtn decompTransitionBtn" onclick="startDecompositionPhase()">🌳 Árbol de subfórmulas →</button>`
        : "";

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
                ${decompBtn}
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



// =====================================================
// SMART FILL: verificación e autocompletado
// =====================================================

function checkSmartFillEligibility(){
    if(gameState.solveLevel !== 'asistido') return false;
    if(!guidedTable.rows || !guidedTable.columns) return false;

    let col  = guidedTable.columns[currentColumn];
    let rows = guidedTable.rows;

    let remaining = rows.filter(r => r[col] === undefined).length;
    if(remaining === 0) return false;

    // Condición 1: todas las filas V ya están completadas
    let allVFilled = rows.every(r => {
        return !solveSubformula(col, r) || r[col] !== undefined;
    });
    if(allVFilled) return true;

    // Condición 2: al menos 2 filas completadas manualmente
    return manualCellsInColumn >= 2;
}

function verificarYAutocompletar(){
    let col    = guidedTable.columns[currentColumn];
    let colIdx = currentColumn;

    guidedTable.rows.forEach((row, rowIdx) => {
        if(row[col] === undefined){
            guidedTable.rows[rowIdx][col] = solveSubformula(col, row);
            autoCompletedCells.add(colIdx + ',' + rowIdx);
        }
    });

    renderGuidedTable();

    const opNames = {'∧':'conjunción','∨':'disyunción','→':'implicación','↔':'bicondicional','¬':'negación'};
    let op     = getMainOperatorChar(col);
    let opName = op ? (opNames[op] || op) : 'operador';

    document.getElementById("feedback").innerHTML = `
        <div class="ogFeedback ogCorrect">
            <div class="ogFeedbackTitle">🤖 ¡Columna completada!</div>
            <div class="ogExplanation">
                Verificaste el patrón de la <b>${opName}</b> correctamente.
                Las celdas con borde punteado fueron autocompletadas.
            </div>
            <button class="ogNextBtn" onclick="advanceAfterSmartFill(); return false;">Continuar →</button>
        </div>
    `;
}

function advanceAfterSmartFill(){
    currentRowInColumn  = 0;
    currentColumn++;
    manualCellsInColumn = 0;
    document.getElementById("feedback").innerHTML = "";

    if(currentColumn >= guidedTable.columns.length){
        renderGuidedTable();
        showGuidedEnd();
        return;
    }

    renderGuidedTable();
    showColumnQuestion();
}

// =====================================================
// DESCOMPOSICIÓN: ÁRBOL DE SUBFÓRMULAS
// =====================================================

function startDecompositionPhase(){
    gameState.phase = 'decomposition';
    let formula     = gameState.formula;

    let subs = extractSubformulas(formula).filter(
        f => !/^[a-z]$/i.test(f.replace(/[()¬]/g, ''))
    );

    decompositionState = {
        formula,
        subformulas:    subs,
        currentOptions: [],
        currentIndex:   0,
        score:          0,
        mistakes:       0
    };

    clearMainAreas();
    renderDecompositionQuestion();
}

function generateDecompositionDistractors(correct, formula, allSubs){
    let pool = new Set();

    // Otras subfórmulas de la misma fórmula
    allSubs.forEach(s => { if(s !== correct) pool.add(s); });

    // Variantes cambiando operador
    let op   = getMainOperatorChar(correct);
    let deps = getDirectDependencies(correct);
    if(deps.length === 2){
        ['∧','∨','→','↔'].filter(o => o !== op).forEach(o => {
            pool.add('(' + deps[0] + o + deps[1] + ')');
        });
    } else if(op === '¬' && deps.length === 1){
        pool.add(deps[0]);
    }

    // Variables como distractor de último recurso
    getVariables(formula).forEach(v => pool.add(v));

    return shuffleArray([...pool].filter(d => d !== correct)).slice(0, 3);
}

function renderDecompositionQuestion(){
    let ds = decompositionState;

    if(ds.currentIndex >= ds.subformulas.length){
        showDecompositionEnd();
        return;
    }

    let correct     = ds.subformulas[ds.currentIndex];
    let distractors = generateDecompositionDistractors(correct, ds.formula, ds.subformulas);
    let options     = shuffleArray([correct, ...distractors]);
    ds.currentOptions = options;

    let total   = ds.subformulas.length;
    let current = ds.currentIndex + 1;
    let op      = getMainOperatorChar(correct);
    const opNames = {'∧':'conjunción','∨':'disyunción','→':'implicación','↔':'bicondicional','¬':'negación'};
    let opName = op ? (opNames[op] || op) : '?';

    document.getElementById("progress").innerHTML = `
        <div class="gameProgressBar">
            <span class="gpItem">🌳 Árbol ${current}/${total}</span>
            <span class="gpItem gpScore">⭐ ${ds.score} pts</span>
            <span class="gpItem">❌ ${ds.mistakes}</span>
            <button class="gpExit" onclick="exitDecomposition()">✕ Salir</button>
        </div>
    `;

    document.getElementById("questionArea").innerHTML = `
        <div class="operatorGameCard">
            <div class="ogInstruction">
                Identificá la subfórmula con operador <b>${op || '?'}</b> (${opName}):
            </div>
            <div class="decompFormula" aria-label="Fórmula: ${ds.formula}">${ds.formula}</div>
            <div class="decompOptions" id="decompOptions" role="group" aria-label="Opciones">
                ${options.map((opt, i) => `
                    <button class="decompOptBtn"
                            onclick="checkDecompositionAnswer(${i})"
                            aria-label="Opción ${i + 1}: ${opt}">
                        ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById("feedback").innerHTML = "";
}

function checkDecompositionAnswer(idx){
    let ds      = decompositionState;
    let correct = ds.subformulas[ds.currentIndex];
    let chosen  = ds.currentOptions[idx];
    let isOk    = (chosen === correct);

    document.querySelectorAll("#decompOptions .decompOptBtn").forEach((btn, i) => {
        btn.disabled = true;
        if(ds.currentOptions[i] === correct) btn.classList.add("decompOptCorrect");
        if(i === idx && !isOk)               btn.classList.add("decompOptWrong");
    });

    if(isOk){
        ds.score += 10;
        let deps    = getDirectDependencies(correct);
        let depsStr = deps.map(d => `<b>${d}</b>`).join(' y ');
        document.getElementById("feedback").innerHTML = `
            <div class="ogFeedback ogCorrect">
                <div class="ogFeedbackTitle">✅ ¡Correcto! <span class="ogPoints">+10 pts</span></div>
                <div class="ogExplanation">
                    La subfórmula <b>${correct}</b> se compone de ${depsStr}.
                </div>
                <button class="ogNextBtn" onclick="advanceDecomposition()">Continuar →</button>
            </div>
        `;
    } else {
        ds.mistakes++;
        document.getElementById("feedback").innerHTML = `
            <div class="ogFeedback ogWrong">
                <div class="ogFeedbackTitle">❌ No es esa</div>
                <div class="ogExplanation">La subfórmula correcta es <b>${correct}</b>.</div>
                <button class="ogNextBtn" onclick="advanceDecomposition()">Continuar →</button>
            </div>
        `;
    }
}

function advanceDecomposition(){
    decompositionState.currentIndex++;
    renderDecompositionQuestion();
}

function showDecompositionEnd(){
    document.getElementById("progress").innerHTML = "";
    document.getElementById("feedback").innerHTML = "";

    document.getElementById("questionArea").innerHTML = `
        <div class="ogEndCard">
            <div class="ogEndMedal">🌳</div>
            <h2 class="ogEndTitle">¡Árbol completado!</h2>
            <p class="ogEndMsg">
                Entendiste la estructura de <b>${decompositionState.formula}</b>.<br>
                Ahora resolvé la tabla de verdad completa.
            </p>
            <div class="ogEndStats">
                <div class="ogStat">
                    <span class="ogStatVal">⭐ ${decompositionState.score}</span>
                    <span class="ogStatLabel">puntos</span>
                </div>
                <div class="ogStat">
                    <span class="ogStatVal">❌ ${decompositionState.mistakes}</span>
                    <span class="ogStatLabel">errores</span>
                </div>
            </div>
            <p class="decompLevelPrompt">Elegí el nivel de ayuda:</p>
            <div class="ogEndBtns">
                <button class="ogNextBtn"
                        onclick="startGuidedModeFromPipeline('principiante')"
                        aria-label="Nivel principiante: paso a paso guiado">
                    📚 Principiante
                </button>
                <button class="ogRetryBtn"
                        onclick="startGuidedModeFromPipeline('asistido')"
                        aria-label="Nivel asistido: Smart Fill disponible">
                    ⚡ Asistido (Smart Fill)
                </button>
            </div>
        </div>
    `;
}

function exitDecomposition(){
    gameState.phase = 'idle';
    clearMainAreas();
}

function startGuidedModeFromPipeline(level){
    gameState.solveLevel = level;
    gameState.phase      = 'table_solving';
    document.getElementById("formula").value = gameState.formula;
    startGuidedMode();
}

// DEBUG
console.log("Logic Tutor cargado correctamente");
