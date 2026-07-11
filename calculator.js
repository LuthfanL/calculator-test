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
    renderLayerInputs();

    layerCountInput.addEventListener('change', renderLayerInputs);
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
                renderLayerInputs();
            }
        }
    });

    btnCalculate.addEventListener('click', calculateProperties);
}

// Render dynamic inputs based on total layers
function renderLayerInputs() {
    let count = parseInt(layerCountInput.value);
    if (isNaN(count) || count < 1) count = 5;

    layerContainer.innerHTML = '';

    for (let i = 1; i <= count; i++) {
        let orientation = (i % 2 === 0) ? 'minor' : 'major';
        let html = `
        <div class="border rounded p-2 mb-2 bg-white">
            <label class="fw-bold fs-6 mb-1">Layer ${i}</label>
            <div class="row g-2">
                <div class="col-4">
                    <input type="number" class="form-control form-control-sm layer-thick" placeholder="Thick" value="35">
                </div>
                <div class="col-4">
                    <select class="form-select form-select-sm layer-orient">
                        <option value="major" ${orientation === 'major' ? 'selected' : ''}>Major (0°)</option>
                        <option value="minor" ${orientation === 'minor' ? 'selected' : ''}>Minor (90°)</option>
                    </select>
                </div>
                <div class="col-4">
                    <select class="form-select form-select-sm layer-grade">
                        <option value="MGP10">MGP10</option>
                        <option value="MGP12">MGP12</option>
                    </select>
                </div>
            </div>
        </div>`;
        layerContainer.insertAdjacentHTML('beforeend', html);
    }
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

        let thickInputs = document.querySelectorAll('.layer-thick');
        let orientInputs = document.querySelectorAll('.layer-orient');
        let gradeInputs = document.querySelectorAll('.layer-grade');

        for (let i = 0; i < count; i++) {
            let t = parseFloat(thickInputs[i].value);
            let orient = orientInputs[i].value;
            let gradeName = gradeInputs[i].value;

            let layer = new CLTLayerType(t, orient, materials[gradeName]);
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