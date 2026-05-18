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

       for(let i=expr.length-1; i>=0; i--){
        

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

        // =========================
        // QUITAR PARÉNTESIS EXTERNOS
        // =========================

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
                    expression.slice(1,-1).trim();

            }

        }

        // =========================
        // NEGACIÓN SIMPLE
        // =========================

        if(
            expression.startsWith("¬") &&
            !expression.includes("∧") &&
            !expression.includes("∨") &&
            !expression.includes("→") &&
            !expression.includes("↔")
        ){

            let inner =
                expression.slice(1).trim();

            recursiveExtract(inner);

            subformulas.push(
                "¬" + inner
            );

            return;

        }

        // =========================
        // OPERADORES BINARIOS
        // =========================

        let operators =
            ["↔","→","∨","∧"];

        for(let op of operators){

            let balance = 0;

            // derecha → izquierda
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

                    // resolver partes
                    recursiveExtract(left);
                    recursiveExtract(right);

                    // agregar negaciones internas
                    if(
                        left.startsWith("¬")
                    ){

                        subformulas.push(left);

                    }

                    if(
                        right.startsWith("¬")
                    ){

                        subformulas.push(right);

                    }

                    // agregar fórmula completa
                    subformulas.push(
                        "(" +
                        left +
                        op +
                        right +
                        ")"
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

    // =========================
    // QUITAR PARÉNTESIS EXTERNOS
    // =========================

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

            expr =
                expr.slice(1,-1).trim();

        }

    }

    // =========================
    // NEGACIÓN
    // =========================

    if(expr.startsWith("¬")){

        return !solveSubformula(
            expr.slice(1),
            values
        );

    }

    // =========================
    // OPERADORES
    // =========================

    let operators =
        ["↔","→","∨","∧"];

    for(let op of operators){

        let balance = 0;

        // recorrer derecha → izquierda
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

    // =========================
    // VARIABLE SIMPLE
    // =========================

    return values[expr];

}

// =========================
// VALIDAR FÓRMULA
// =========================

function isValidFormula(expr){

    expr = expr.replace(/\s/g,"");

    // caracteres permitidos
    const validChars =
     /^[pqrs∧∨¬→↔()]+$/i;

    if(!validChars.test(expr)){

        return false;

    }

    // no puede terminar u empezar mal
    if(
        /^[∧∨→↔]/.test(expr) ||
        /[∧∨¬→↔]$/.test(expr)
    ){

        return false;

    }

    // variables pegadas
    if(
        /[a-z][a-z]/i.test(expr)
    ){

        return false;

    }
    // variable seguida de variable o negación
if(
    /[a-z](?:[a-z]|¬|\()/i.test(expr)
){

    return false;

}

    // operadores repetidos
    if(
        /[∧∨→↔]{2,}/.test(expr)
    ){

        return false;

    }
        // variable seguida de negación
    if(
       /[a-z]¬/i.test(expr)
    ){

        return false;

    }

    // variable seguida de (
    if(
        /[a-z]\(/i.test(expr)
    ){

        return false;

    }

    // ) seguida de variable
    if(
        /\)[a-z]/i.test(expr)
    ){

        return false;

    }

    // ) seguida de ¬
    if(
        /\)¬/.test(expr)
    ){

        return false;

    }

    // operador seguido de )
    if(
        /[∧∨→↔]\)/.test(expr)
    ){

        return false;

    }

    // ( seguido de operador binario
    if(
        /\([∧∨→↔]/.test(expr)
    ){

        return false;

    }

    // paréntesis balanceados
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
// GENERAR TABLA
// =========================

function generateTruthTable(){

    const formula =
        document.getElementById("formula")
        .value
        .trim();

   if(formula === "") return;

if(!isValidFormula(formula)){

    alert(
        "La fórmula lógica no es válida"
    );

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

if(!isValidFormula(formula)){

    alert(
        "La fórmula lógica no es válida"
    );

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

    currentRowInColumn = 0;

    renderGuidedTable();

    showColumnQuestion();

}



// =========================
// DIBUJAR TABLA
// =========================

function renderGuidedTable(){

    let currentFormula = "";

    // evitar error al terminar
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



    // CABECERAS

    guidedTable.columns.forEach((col,index)=>{

        let className = "";

        // columnas necesarias
        if(
            dependencies.includes(col)
        ){

            className =
                "dependencyColumn";

        }

        // columna actual
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

            // dependencias
            if(
                dependencies.includes(col)
            ){

                className =
                    "dependencyColumn";

            }

            // columna actual
            if(index === currentColumn){

                className =
                    "currentColumn";

            }

            // fila activa
            if(
                rowIndex ===
                currentRowInColumn
                &&
                currentColumn <
                guidedTable.columns.length
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

    // RESPUESTA CORRECTA
    if(answer === currentAnswer){

        // limpiar feedback
        feedback.innerHTML = "";

        // fórmula actual
        let formula =
            guidedTable.columns[currentColumn];

        // guardar resultado en la fila actual
        guidedTable.rows[currentRowInColumn][formula]
            = answer;

        // REDIBUJAR inmediatamente
        // para que aparezca el último valor
        renderGuidedTable();

        // avanzar fila
        currentRowInColumn++;

        // terminó la columna
        if(
            currentRowInColumn >=
            guidedTable.rows.length
        ){

            currentRowInColumn = 0;

            currentColumn++;

        }

        // TERMINÓ TODA LA TABLA
        if(
            currentColumn >=
            guidedTable.columns.length
        ){

            // redibujar tabla final completa
            renderGuidedTable();

            // limpiar progreso
            document.getElementById(
                "progress"
            ).innerHTML = "";

            // limpiar feedback
            feedback.innerHTML = "";

            // mensaje final
            document.getElementById(
                "questionArea"
            ).innerHTML = `

            <div class="step">
                🎉 ¡Tabla completada!
            </div>

            `;
            document.getElementById(
    "formula"
).value = "";

            return;

        }

        // redibujar nueva columna/fila activa
        renderGuidedTable();

        // siguiente pregunta
        showColumnQuestion();

    }

    // RESPUESTA INCORRECTA
    else{

        feedback.innerHTML = `

        <div class="feedback wrong">
            ❌ Intenta nuevamente
        </div>

        `;

    }

}



// DEBUG

console.log(
    "Logic Tutor cargado correctamente"
);
