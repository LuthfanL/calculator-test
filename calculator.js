/**
 * This class to organize the input data for panel calculation
 * To Render the input data, you can use the following code:
 * 
 * const panelProperties = new PanelProperties();
 */

// Material Grades (Database)
const materials = {
    'MGP10': new MaterialGrade('MGP10', 1100, 110, 687.5, 62.5),
    'MGP12': new MaterialGrade('MGP12', 1100, 110, 687.5, 62.5)
};

const methodSelect = document.getElementById('method-select');
const layerCountInput = document.getElementById('layer-count');
const layerHelp = document.getElementById('layer-help');
const layerContainer = document.getElementById('layer-container');
const btnCalculate = document.getElementById('btn-calculate');
const errorAlert = document.getElementById('error-alert');

const outputContainer = document.getElementById('output-container');
const emptyState = document.getElementById('empty-state');
const resultThead = document.getElementById('result-thead');
const resultTbody = document.getElementById('result-tbody');
const resultTfoot = document.getElementById('result-tfoot');
const finalEi = document.getElementById('final-ei');

// Init
function init() {
    methodSelect.addEventListener('change', () => {
        let method = methodSelect.value;
        if (method === 'shear') {
            layerHelp.innerText = "3 hingga 9 layer (Simetris).";
            layerCountInput.min = 3;
            layerCountInput.max = 9;
        } else {
            layerHelp.innerText = "Hanya 3 atau 5 layer.";
            if (layerCountInput.value !== '3' && layerCountInput.value !== '5') {
                layerCountInput.value = 5;
            }
        }
    });

    btnCalculate.addEventListener('click', calculateProperties);
}


// Retrieve data n Calculate
function calculateProperties() {
    errorAlert.classList.add('d-none');

    try {
        let method = methodSelect.value;
        let count = parseInt(layerCountInput.value);
        let lengthM = parseFloat(document.getElementById('panel-length').value) || 5;
        let beff = parseFloat(document.getElementById('panel-beff').value) || 1000;

        let layup = new CLTLayupType(lengthM * 1000);

        let globalThick = parseFloat(document.getElementById('global-thick').value) || 35;
        let globalGrade = document.getElementById('global-grade').value || 'MGP10';

        for (let i = 1; i <= count; i++) {
            // Layer 1 (i=1) is major, Layer 2 (i=2) is minor, Layer 3 (i=3) is major...
            let orient = (i % 2 === 0) ? 'minor' : 'major';
            let layer = new CLTLayerType(globalThick, orient, materials[globalGrade]);
            layup.addLayer(layer);
        }

        // Execute Calculation
        let calculator = method === 'shear' ? new ShearAnalogyMethod(beff) : new GammaMethod(beff);
        let properties = calculator.calculate(layup);

        renderOutput(properties, method);

    } catch (err) {
        showError(err.message);
    }
}

function renderOutput(properties, method) {
    emptyState.classList.add('d-none');
    outputContainer.classList.remove('d-none');

    resultThead.innerHTML = '';
    resultTbody.innerHTML = '';
    resultTfoot.innerHTML = '';

    // Header
    let trHead = document.createElement('tr');
    trHead.innerHTML = `<th>Layer</th>
                        <th>E<sub>i,xx</sub> (MPa)</th>
                        <th>b<sub>eff</sub> t<sub>i</sub>³ / 12 (mm⁴)</th>
                        <th>b<sub>eff</sub> t<sub>i</sub> a<sub>i</sub>² (mm⁴)</th>`;
    if (method === 'gamma') {
        trHead.innerHTML += `<th>γ<sub>i</sub> (-)</th>`;
    }
    trHead.innerHTML += `<th>E<sub>i</sub> I<sub>i</sub> (N-mm²/m)</th>`;
    resultThead.appendChild(trHead);

    // Rows
    let sumEiIi = 0;

    properties.layers.forEach(lyr => {
        let tr = document.createElement('tr');

        let a_squared = lyr.A * Math.pow(lyr.a, 2);

        let html = `<td>L${lyr.layerIndex}</td>
                    <td>${lyr.E.toFixed(1)}</td>
                    <td>${lyr.I > 0 ? lyr.I.toExponential(2).toUpperCase() : '0.00E+00'}</td>
                    <td>${a_squared > 0 ? a_squared.toExponential(2).toUpperCase() : '0.00E+00'}</td>`;

        if (method === 'gamma') {
            html += `<td>${lyr.gamma.toFixed(3)}</td>`;
        }

        let ei_ii = lyr.E_I + lyr.E_A_a2;
        html += `<td>${ei_ii.toExponential(2).toUpperCase()}</td>`;

        tr.innerHTML = html;
        resultTbody.appendChild(tr);

        sumEiIi += ei_ii;
    });

    // Footer
    let colspan = method === 'gamma' ? 5 : 4;
    resultTfoot.innerHTML = `<tr>
                                <td colspan="${colspan}" class="text-end fw-bold">Σ E<sub>i</sub>I<sub>i</sub></td>
                                <td class="fw-bold">${sumEiIi.toExponential(3).toUpperCase()}</td>
                             </tr>`;

    // Final
    finalEi.innerText = sumEiIi.toExponential(3).toUpperCase() + " N-mm²/m";
}

function showError(msg) {
    errorAlert.innerText = msg;
    errorAlert.classList.remove('d-none');
    outputContainer.classList.add('d-none');
    emptyState.classList.remove('d-none');
}

init();