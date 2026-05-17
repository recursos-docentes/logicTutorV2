let guidedRows = [];
let currentAnswer = false;
let guidedTable = {};
let currentColumn = 0;
let currentRow = 0;
let currentStep = 0;
let currentSteps = [];

function extractSubformulas(expr){

    let subformulas = [];

    function recursiveExtract(expression){

        expression = expression.trim();

        // eliminar paréntesis externos innecesarios
        if(
            expression.startsWith("(") &&
            expression.endsWith(")")
        ){

            let balance = 0;
            let valid = true;

            for(let i = 0; i < expression.length - 1; i++){

                if(expression[i] === "(") balance++;
                if(expression[i] === ")") balance--;

                if(balance === 0){
                    valid = false;
                    break;
                }

            }

            if(valid){

                expression = expression.slice(1,-1);

            }

        }

        // NEGACIÓN
        if(expression.startsWith("¬")){

            let inner = expression.slice(1);

            recursiveExtract(inner);

            subformulas.push("¬" + inner);

            return;

        }

        // buscar operador principal respetando precedencia
        let operators = ["↔","→","∨","∧"];

        for(let op of operators){

            let balance = 0;

            for(let i = 0; i < expression.length; i++){

                let char = expression[i];

                if(char === "(") balance++;
                if(char === ")") balance--;

                if(balance === 0 && char === op){

                    let left = expression.slice(0,i);
                    let right = expression.slice(i+1);

                    recursiveExtract(left);
                    recursiveExtract(right);

                    subformulas.push(left + op + right);

                    return;

                }

            }

        }

    }

    recursiveExtract(expr);

    return [...new Set(subformulas)];

}

function insertSymbol(symbol){

    let textarea = document.getElementById("formula");

    textarea.value += symbol;

}

function getVariables(expr){

    let vars = expr.match(/[a-z]/g);

    return [...new Set(vars)].sort();

}

function evaluateExpression(expr, values){

    let parsed = expr;

    parsed = parsed.replace(/¬/g, "!");
    parsed = parsed.replace(/∧/g, "&&");
    parsed = parsed.replace(/∨/g, "||");
    parsed = parsed.replace(/→/g, " <= ");
    parsed = parsed.replace(/↔/g, " == ");

    parsed = parsed.replace(/([a-z])/g, function(match){

        return values[match];

    });

    try{

        return eval(parsed);

    }catch{

        return false;

    }

}

function solveSubformula(expr, values){

    expr = expr.trim();

    // NEGACIÓN
    if(expr.startsWith("¬")){

        let inner = expr.slice(1);

        return !solveSubformula(inner, values);

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

    let operators = ["↔","→","∨","∧"];

    for(let op of operators){

        let balance = 0;

        for(let i=0; i<expr.length; i++){

            if(expr[i] === "(") balance++;
            if(expr[i] === ")") balance--;

            if(balance === 0 && expr[i] === op){

                let left = expr.slice(0,i);
                let right = expr.slice(i+1);

                let A = solveSubformula(left, values);
                let B = solveSubformula(right, values);

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

    // variable simple
    return values[expr];

}

function renderGuidedTable(){

    let html = "<table><tr>";

    // encabezados
    guidedTable.columns.forEach((col,index)=>{

        let active = index === currentColumn
            ? 'style="background:#ffeaa7;"'
            : "";

        html += `<th ${active}>${col}</th>`;

    });

    html += "</tr>";

    // filas
    guidedTable.rows.forEach((row,rowIndex)=>{

        html += "<tr>";

        guidedTable.columns.forEach((col,colIndex)=>{

            let value = row[col];

            let active = colIndex === currentColumn
                ? 'style="background:#fff8d6;"'
                : "";

            if(value === undefined){

                value = "?";

            }else{

                value = value ? "V" : "F";

            }

            html += `
            <td ${active}>
                ${value}
            </td>
            `;

        });

        html += "</tr>";

    });

    html += "</table>";

    document.getElementById("tableContainer").innerHTML = html;

}


function generateTruthTable(){

    const formula = document.getElementById("formula").value;

    const vars = getVariables(formula);

    const rows = Math.pow(2, vars.length);

    let subformulas = extractSubformulas(formula);

    subformulas = subformulas.filter(
        f => !/^[a-z]$/i.test(f)
    );

    let columns = [...vars, ...subformulas];

    let table = "<table><tr>";

    columns.forEach(col=>{

        table += `<th>${col}</th>`;

    });

    table += "</tr>";

    for(let i = 0; i < rows; i++){

        let values = {};

        // VARIABLES BASE
        vars.forEach((v,index)=>{

            values[v] = !Boolean(
                (i >> (vars.length-index-1)) & 1
            );

        });

        table += "<tr>";

        // mostrar variables
        vars.forEach(v=>{

            table += `
            <td class="${values[v] ? 'true':'false'}">
            ${values[v] ? 'V':'F'}
            </td>
            `;

        });

        // resolver subfórmulas EN ORDEN
        subformulas.forEach(sub=>{

            let result = solveSubformula(sub, values);

            // GUARDAR RESULTADO
            values[sub] = result;

            table += `
            <td class="${result ? 'true':'false'}">
            ${result ? 'V':'F'}
            </td>
            `;

        });

        table += "</tr>";

    }

    table += "</table>";

    document.getElementById("tableContainer").innerHTML = table;

}

function startGuidedMode(){

    const formula = document.getElementById("formula").value;

    const vars = getVariables(formula);

    const rows = Math.pow(2, vars.length);

    let subformulas = extractSubformulas(formula);

    subformulas = subformulas.filter(
        f => !/^[a-z]$/i.test(f)
    );

    guidedRows = [];

    for(let i = 0; i < rows; i++){

        let values = {};

        vars.forEach((v,index)=>{

            values[v] = !Boolean(
                (i >> (vars.length-index-1)) & 1
            );

        });

        let steps = [];

        subformulas.forEach(sub=>{

            let result = solveSubformula(sub, values);

            steps.push({
                formula: sub,
                result: result
            });

        });

        guidedRows.push({

            vars: values,
            steps: steps

        });

    }

    currentRow = 0;
    currentStep = 0;

    showStep();

}

function showStep(){

    let row = guidedRows[currentRow];

    let step = row.steps[currentStep];

    currentAnswer = step.result;

    let valuesText = "";

    for(let key in row.vars){

        valuesText += `
        <div>
            <b>${key}</b> =
            ${row.vars[key] ? '🟩 Verdadero' : '🟦 Falso'}
        </div>
        `;

    }

    document.getElementById("progress").innerHTML = `
    Fila ${currentRow + 1} de ${guidedRows.length}
    ·
    Paso ${currentStep + 1} de ${row.steps.length}
    `;

    document.getElementById("questionArea").innerHTML = `

    <div class="question">

        ${valuesText}

        <br>

        Resuelve:

        <br><br>

        <div class="step current">

            <b>${step.formula}</b>

        </div>

        <div class="answerButtons">

            <button onclick="checkStepAnswer(true)">
                🟩 Verdadero
            </button>

            <button onclick="checkStepAnswer(false)">
                🟦 Falso
            </button>

        </div>

    </div>

    `;

}

function checkStepAnswer(answer){

    let feedback = document.getElementById("feedback");

    if(answer === currentAnswer){

        feedback.innerHTML = `
        <div class="feedback correct">
        ✅ ¡Correcto!
        </div>
        `;

        currentStep++;

        let row = guidedRows[currentRow];

        // siguiente fila
        if(currentStep >= row.steps.length){

            currentStep = 0;
            currentRow++;

        }

        // terminó todo
        if(currentRow >= guidedRows.length){

            document.getElementById("questionArea").innerHTML = `
            <div class="step">
            🎉 ¡Excelente trabajo!
            </div>
            `;

            return;

        }

        setTimeout(()=>{

            showStep();

        },1000);

    }else{

        feedback.innerHTML = `
        <div class="feedback wrong">
        ❌ Intenta nuevamente.
        </div>
        `;

    }

}


function askQuestion(){

    if(currentRow >= guidedRows.length){

        document.getElementById("questionArea").innerHTML = `
        <div class="step">
        🎉 ¡Excelente trabajo! Has completado todos los ejercicios.
        </div>
        `;

        document.getElementById("progress").innerHTML = "";

        return;

    }

    let formula = document.getElementById("formula").value;

    let row = guidedRows[currentRow];

    currentAnswer = row.finalResult;

    // VARIABLES
    let valuesText = "";

    for(let key in row.vars){

        if(/^[a-z]$/i.test(key)){

            valuesText += `
            <div>
                <b>${key}</b> =
                ${row.vars[key] ? '🟩 Verdadero' : '🟦 Falso'}
            </div>
            `;

        }

    }

    // PASOS
    let stepsText = "";

    row.steps.forEach(step=>{

        stepsText += `
        <div class="step">
            <b>${step.formula}</b>
            =
            ${step.result ? '🟩 V' : '🟦 F'}
        </div>
        `;

    });

    document.getElementById("progress").innerHTML = `
    Ejercicio ${currentRow + 1} de ${guidedRows.length}
    `;

    document.getElementById("questionArea").innerHTML = `

    <div class="question">

        ${valuesText}

        <br>

        <b>Resolución paso a paso:</b>

        ${stepsText}

        <br>

        ¿Resultado final de:

        <br><br>

        <b>${formula}</b>

        ?

        <div class="answerButtons">

            <button onclick="checkAnswer(true)">
                🟩 Verdadero
            </button>

            <button onclick="checkAnswer(false)">
                🟦 Falso
            </button>

        </div>

    </div>

    `;

}

function checkAnswer(answer){

    let feedback = document.getElementById("feedback");

    if(answer === currentAnswer){

        feedback.innerHTML = `
        <div class="feedback correct">
        ✅ ¡Muy bien!
        </div>
        `;

    }else{

        feedback.innerHTML = `
        <div class="feedback wrong">
        ❌ Intenta nuevamente observando los valores.
        </div>
        `;

        return;

    }

    currentRow++;

    setTimeout(()=>{

        askQuestion();

    },1500);

}
