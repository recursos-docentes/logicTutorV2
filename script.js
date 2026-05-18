let guidedTable = {};

let currentColumn = 0;
let currentRowInColumn = 0;
let currentAnswer = false;



// =========================
// INSERTAR SÍMBOLOS
// =========================

function insertSymbol(symbol){

    const textarea =
        document.getElementById("formula");

    textarea.focus();

    const start =
        textarea.selectionStart;

    const end =
        textarea.selectionEnd;

    textarea.value =
        textarea.value.substring(0, start)
        + symbol +
        textarea.value.substring(end);

    textarea.selectionStart =
    textarea.selectionEnd =
        start + symbol.length;

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



// =========================
// DEPENDENCIAS DIRECTAS
// =========================

function getDirectDependencies(expr){

    expr = expr.trim();

    // quitar paréntesis externos
    if(
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

            expr = expr.slice(1,-1);

        }

    }

    // NEGACIÓN
    if(expr.startsWith("¬")){

        return [expr.slice(1)];

    }

    let operators = ["↔","→","∨","∧"];

    for(let op of operators){

        let balance = 0;

        for(let i=0; i<expr.length; i++){

            if(expr[i] === "(") balance++;
            if(expr[i] === ")") balance--;

            if(
                balance === 0 &&
                expr[i] === op
            ){

                let left =
                    expr.slice(0,i).trim();

                let right =
                    expr.slice(i+1).trim();

                return [left,right];

            }

        }

    }

    return [expr];

}



// =========================
// EXTRAER SUBFÓRMULAS
// =========================

function extractSubformulas(expr){

    let subformulas = [];

    function recursiveExtract(expression){

        expression = expression.trim();

        // quitar paréntesis externos
        if(
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
                    expression.slice(1,-1);

            }

        }

        // NEGACIÓN
        if(expression.startsWith("¬")){

            let inner =
                expression.slice(1);

            recursiveExtract(inner);

            subformulas.push(
                "¬" + inner
            );

            return;

        }

        // operadores
        let operators =
            ["↔","→","∨","∧"];

        for(let op of operators){

            let balance = 0;

            for(let i=0; i<expression.length; i++){

                if(expression[i] === "(") balance++;
                if(expression[i] === ")") balance--;

                if(
                    balance === 0 &&
                    expression[i] === op
                ){

                    let left =
                        expression.slice(0,i);

                    let right =
                        expression.slice(i+1);

                    recursiveExtract(left);
                    recursiveExtract(right);

                    subformulas.push(
                        left + op + right
                    );

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

    // NEGACIÓN
    if(expr.startsWith("¬")){

        let inner =
            expr.slice(1);

        return !solveSubformula(
            inner,
            values
        );

    }

    // quitar paréntesis externos
    if(
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

            expr = expr.slice(1,-1);

        }

    }

    let operators =
        ["↔","→","∨","∧"];

    for(let op of operators){

        let balance = 0;

        for(let i=0; i<expr.length; i++){

            if(expr[i] === "(") balance++;
            if(expr[i] === ")") balance--;

            if(
                balance === 0 &&
                expr[i] === op
            ){

                let left =
                    expr.slice(0,i);

                let right =
                    expr.slice(i+1);

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

    return values[expr];

}



// =========================
// GENERAR TABLA
// =========================

function generateTruthTable(){

    const formula =
        document.getElementById("formula")
        .value
        .trim();

    if(formula === "") return;

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

    let html = "<table><tr>";

    columns.forEach(col=>{

        html += `<th>${col}</th>`;

    });

    html += "</tr>";



    for(let i=0; i<rowsCount; i++){

        let values = {};

        vars.forEach((v,index)=>{

            values[v] = !Boolean(
                (i >> (vars.length-index-1)) & 1
            );

        });

        html += "<tr>";

        columns.forEach(col=>{

            let result;

            if(vars.includes(col)){

                result = values[col];

            }else{

                result =
                    solveSubformula(
                        col,
                        values
                    );

            }

            values[col] = result;

            html += `
            <td class="${
                result ? 'true':'false'
            }">
                ${result ? 'V':'F'}
            </td>
            `;

        });

        html += "</tr>";

    }

    html += "</table>";

    document.getElementById(
        "tableContainer"
    ).innerHTML = html;

}



// =========================
// INICIAR MODO GUIADO
// =========================

function startGuidedMode(){

    const formula =
        document.getElementById("formula")
        .value
        .trim();

    if(formula === "") return;

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

    currentRowInColumn = 0;

    renderGuidedTable();

    showColumnQuestion();

}



// =========================
// DIBUJAR TABLA
// =========================

function renderGuidedTable(){

    let currentFormula =
        guidedTable.columns[currentColumn];

    let dependencies =
        getDirectDependencies(
            currentFormula
        );

    let html = "<table><tr>";



    // CABECERAS

    guidedTable.columns.forEach((col,index)=>{

        let className = "";

        if(
            dependencies.includes(col)
        ){

            className =
                "dependencyColumn";

        }

        if(index === currentColumn){

            className =
                "currentColumn";

        }

        html += `
        <th class="${className}">
            ${col}
        </th>
        `;

    });

    html += "</tr>";



    // FILAS

    guidedTable.rows.forEach((row,rowIndex)=>{

        html += "<tr>";

        guidedTable.columns.forEach((col,index)=>{

            let className = "";

            if(
                dependencies.includes(col)
            ){

                className =
                    "dependencyColumn";

            }

            if(index === currentColumn){

                className =
                    "currentColumn";

            }

            // fila actual
            if(
                rowIndex ===
                currentRowInColumn
            ){

                className +=
                    " activeRow";

            }

            let value = row[col];

            let text = "?";

            if(value !== undefined){

                text =
                    value ? "V":"F";

            }

            html += `
            <td class="${className}">
                ${text}
            </td>
            `;

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

    let formula =
        guidedTable.columns[currentColumn];

    let row =
        guidedTable.rows[currentRowInColumn];

    currentAnswer =
        solveSubformula(
            formula,
            row
        );

    let dependencies =
        getDirectDependencies(
            formula
        );

    document.getElementById(
        "progress"
    ).innerHTML = `

    Resolviendo columna:
    <b>${formula}</b>

    <br>

    Fila
    ${currentRowInColumn + 1}
    de
    ${guidedTable.rows.length}

    `;



    document.getElementById(
        "questionArea"
    ).innerHTML = `

    <div class="question">

        <h3>${formula}</h3>

        <div class="variablesRow">

            ${dependencies.map(dep=>`

                <div class="variableBox">

                    <span class="variableName">
                        ${dep}
                    </span>

                    <span class="
                        variableValue
                        ${
                            row[dep]
                            ? 'valueTrue'
                            : 'valueFalse'
                        }
                    ">

                        ${
                            row[dep]
                            ? 'V'
                            : 'F'
                        }

                    </span>

                </div>

            `).join("")}

        </div>



        <div class="answerButtons">

            <button
                type="button"
                onclick="checkColumnAnswer(true); return false;">

                🟩 Verdadero

            </button>

            <button
                type="button"
                onclick="checkColumnAnswer(false); return false;">

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
        document.getElementById(
            "feedback"
        );

    if(answer === currentAnswer){

        feedback.innerHTML = "";

        let formula =
            guidedTable.columns[currentColumn];

        guidedTable.rows[currentRowInColumn][formula]
            = answer;

        currentRowInColumn++;

        // terminó columna
        if(
            currentRowInColumn >=
            guidedTable.rows.length
        ){

            currentRowInColumn = 0;

            currentColumn++;

        }

        // terminó tabla
        if(
            currentColumn >=
            guidedTable.columns.length
        ){

            renderGuidedTable();

            document.getElementById(
                "questionArea"
            ).innerHTML = `

            <div class="step">
                🎉 ¡Tabla completada!
            </div>

            `;

            return;

        }

        renderGuidedTable();

        showColumnQuestion();

    }else{

        feedback.innerHTML = `

        <div class="feedback wrong">
            ❌ Intenta nuevamente
        </div>

        `;

    }

console.log("Logic Tutor cargado correctamente");
     }
