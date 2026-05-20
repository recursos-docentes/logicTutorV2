# 🧠 Logic Tutor

Una SPA (Single Page Application) para aprender **tablas de verdad de lógica proposicional** paso a paso, diseñada con foco en la accesibilidad y la reducción de carga cognitiva (TEA / neurodiversidad).

Sin dependencias externas. HTML + CSS + JS puro.

---

## Modos de aprendizaje

### 🎯 Operador Principal
Juego de identificación del operador principal de una fórmula. El estudiante toca el operador correcto directamente sobre la fórmula renderizada.

- Pool de **16 fórmulas** en 3 niveles de dificultad (básico → avanzado)
- Sesión de **5 preguntas** aleatorias por partida
- Si hay una fórmula cargada en el input, se incluye en el pool
- Feedback inmediato con explicación del error (precedencia, paréntesis, etc.)
- Sistema de **racha y puntos** con bonus cada 3 respuestas correctas seguidas

### 🌳 Árbol de Subfórmulas *(pipeline post-juego)*
Etapa intermedia que se desbloquea al terminar el juego de Operador Principal con una fórmula cargada.

- Pregunta de opción múltiple por cada subfórmula del árbol, de la más simple a la más compleja
- Distractores generados automáticamente: otras subfórmulas, variantes con distinto operador, variables sueltas
- Al completar el árbol, el estudiante elige el nivel de "Resolver Conmigo"

### 🧩 Resolver Conmigo
Guía paso a paso para completar la tabla de verdad completa.

**Nivel Principiante**  
Avanza celda por celda. Cada pregunta muestra las dependencias directas resaltadas en la tabla y en cajas de valor. Feedback con explicación del operador al acertar o errar.

**Nivel Asistido — Smart Fill**  
Diseñado como herramienta de verificación de hipótesis:
- El estudiante llena manualmente la columna hasta cumplir una condición:
  - Completó **todas las filas V** de esa columna, **o**
  - Completó **al menos 2 filas** verificadas como correctas
- Solo entonces aparece el botón **"🤖 Autocompletar restantes"**
- Las celdas autocompletadas se marcan con **borde punteado** (`td.auto-completado`) para distinguirlas visualmente de las resueltas por el estudiante

### ✏️ Autoevaluación
Modo libre: el estudiante elige cualquier celda disponible en la tabla y la resuelve en el orden que prefiera. Las celdas bloqueadas (con dependencias sin resolver) aparecen con 🔒.

---

## Ingreso de fórmulas

El textarea acepta fórmulas con los símbolos del panel de botones:

| Símbolo | Operador       |
|---------|----------------|
| `¬`     | Negación       |
| `∧`     | Conjunción     |
| `∨`     | Disyunción     |
| `→`     | Implicación    |
| `↔`     | Bicondicional  |

Variables disponibles: `p`, `q`, `r`, `s`

El validador detecta fórmulas malformadas (paréntesis desbalanceados, operadores consecutivos, variables adyacentes, etc.) antes de iniciar cualquier modo.

---

## Modal de Ayuda ❓

El modal es **contextual**: su contenido cambia según la actividad del estudiante.

| Situación | Contenido |
|---|---|
| Sin actividad | Imagen completa de conectivas + 5 mini-tablas de verdad |
| Resolviendo una columna | Tarjeta con la fórmula y operador activo + imagen con **spotlight** sobre la fila del operador + mini-tabla solo de ese operador |

El **spotlight** usa `box-shadow: 0 0 0 9999px rgba(0,0,0,0.42)` para oscurecer el resto de la imagen y resaltar la fila relevante con una animación de pulso suave.

---

## Arquitectura

```
logicTutor/
├── index.html          # Estructura del DOM (textarea, botones, áreas dinámicas)
├── script.js           # Toda la lógica (~2 000 líneas, sin dependencias)
│   ├── gameState       # Máquina de estados: idle → operator → decomposition → table_solving
│   ├── operatorGame    # Juego de identificación del operador principal
│   ├── decomposition   # Árbol de subfórmulas (opción múltiple)
│   ├── guidedTable     # Estado de la tabla en modos Guiado y Autoevaluación
│   └── Smart Fill      # verificarYAutocompletar(), checkSmartFillEligibility()
├── styles.css          # Estilos (~900 líneas, sin framework)
└── conectivas.png      # Imagen de referencia de conectivas lógicas (1359×1157px)
```

### Flujo de estados (`gameState.phase`)

```
idle
 │
 ├─► [🎯 Operador Principal] ──► operator
 │                                   │
 │                          (fórmula cargada)
 │                                   │
 │                                   ▼
 │                            decomposition ──► [nivel]
 │                                                │
 │                                          table_solving
 │
 ├─► [🧩 Resolver Conmigo] ──────────────► table_solving
 │
 └─► [✏️ Autoevaluación] ────────────────► table_solving (free)
```

### Funciones clave

| Función | Rol |
|---|---|
| `extractSubformulas(expr)` | Devuelve subfórmulas ordenadas de hoja a raíz |
| `findMainOperatorPosition(formula)` | Índice del operador principal en la cadena |
| `solveSubformula(expr, values)` | Evaluador recursivo de la fórmula |
| `getDirectDependencies(expr)` | Subfórmulas directas (izq / der del op. principal) |
| `checkSmartFillEligibility()` | Decide si habilitar el botón Smart Fill |
| `verificarYAutocompletar()` | Completa la columna y marca celdas con `.auto-completado` |
| `renderDecompositionQuestion()` | Muestra la pregunta de opción múltiple del árbol |
| `buildHelpContent()` | Genera el HTML del modal, con o sin spotlight |

---

## Diseño para accesibilidad

- Botones de operador con `aria-label` descriptivos
- Contraste de colores diferenciado: V (verde `#49c774`), F (azul `#4a7dff`)
- Celdas bloqueadas, disponibles y activas con clases CSS diferenciadas
- Feedback de error no destructivo: nunca se borra el trabajo del estudiante
- Overlay de spotlight con `aria-hidden="true"` (decorativo, no semántico)
- Responsive: breakpoint en 700px con botones adaptados a pantalla táctil

---

## Uso local

Solo hay que abrir `index.html` en un navegador. No requiere servidor, build, ni instalación.

```bash
# Opción A — abrir directo
start index.html          # Windows
open index.html           # macOS

# Opción B — servidor local (para evitar restricciones CORS en algunos navegadores)
python -m http.server 5500
# luego abrir http://localhost:5500
```

---

## Personalización

### Agregar fórmulas al juego de Operador Principal
Editar el array `OPERATOR_GAME_CHALLENGES` en `script.js`:
```js
{ formula: "(p∧q)→¬r", hint: "¿El → o la ¬ es el operador principal?", level: 2 }
```

### Ajustar posiciones del spotlight
Si se reemplaza `conectivas.png`, actualizar `CONECTIVAS_ROWS` en `script.js`:
```js
const CONECTIVAS_ROWS = {
    '¬': [19, 16],  // [top%, height%]
    '∧': [33, 16],
    '∨': [47, 16],
    '→': [61, 16],
    '↔': [75, 15]
};
```

### Añadir variables
Agregar botones en `index.html` y extender el regex de `getVariables()` y `isValidFormula()` en `script.js`.

---

## Licencia

MIT
