let guidedRows = [];
let currentRow = 0;
let currentAnswer = false;

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

function generateTruthTable(){

    const formula = document.getElementById("formula").value;

    const vars = getVariables(formula);

    const rows = Math.pow(2, vars.length);

    // obtener subfórmulas
    let subformulas = extractSubformulas(formula);

    // quitar variables simples
    subformulas = subformulas.filter(f => !/^[a-z]$/i.test(f));

    let columns = [...vars, ...subformulas];

    let table = "<table><tr>";

    columns.forEach(col => {

        table += `<th>${col}</th>`;

    });

    table += "</tr>";

    for(let i = 0; i < rows; i++){

        let values = {};

        vars.forEach((v,index)=>{

            values[v] = !Boolean(
                (i >> (vars.length-index-1)) & 1
            );

        });

        table += "<tr>";

        // VARIABLES
        vars.forEach(v=>{

            table += `
            <td class="${values[v] ? 'true':'false'}">
                ${values[v] ? 'V':'F'}
            </td>
            `;

        });

        // SUBFÓRMULAS
        subformulas.forEach(sub=>{

            let result = evaluateExpression(sub, values);

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

    guidedRows = [];

    for(let i=0; i<rows; i++){

        let values = {};

        vars.forEach((v,index)=>{

            values[v] = !Boolean((i >> (vars.length-index-1)) & 1);

        });

        let result = evaluateExpression(formula, values);

        guidedRows.push({
            values,
            result
        });

    }

    currentRow = 0;

    askQuestion();

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

    currentAnswer = row.result;

    let valuesText = "";

    for(let key in row.values){

        valuesText += `
        <div>
        <b>${key}</b> =
        ${row.values[key] ? '🟩 Verdadero':'🟦 Falso'}
        </div>
        `;

    }

    document.getElementById("progress").innerHTML = `
    Ejercicio ${currentRow + 1} de ${guidedRows.length}
    `;

    document.getElementById("questionArea").innerHTML = `

    <div class="question">

    ${valuesText}

    <br>

    ¿Cuál es el resultado de:

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
