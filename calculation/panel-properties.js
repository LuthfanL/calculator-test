/**
 * Class Panel Properties is used to calculate the properties of panel CLT Layup.
 * Panel properties can calculate
 *  - Shear Analogy Method
 *  - Gamma Method
 * 
 * How to use : 
 * calculate(CLTLayup) => PanelProperties
 */

// Base class for panel properties
class PanelProperties {
    constructor(b_eff = 1000) {
        this.b_eff = b_eff;
    }

    calculate(cltLayup) {
        throw new Error("calculate method must be implemented by subclass");
    }

    getLayerModuli(layer) {
        let E = layer.orientation === 'major' ? layer.materialGrade.E : 0;
        let G = layer.orientation === 'major' ? layer.materialGrade.G : layer.materialGrade.G_90;
        return { E, G };
    }
}

class ShearAnalogyMethod extends PanelProperties {
    calculate(cltLayup) {
        const layers = cltLayup.getLayers();
        if (layers.length < 3 || layers.length > 9) {
            throw new Error("Metode Shear Analogy membutuhkan jumlah layer antara 3 hingga 9.");
        }
        if (!cltLayup.isSymmetric()) {
            throw new Error("Metode Shear Analogy mewajibkan susunan layer simetris (dari atas ke bawah).");
        }

        let result = new PanelPropertiesType();

        // total ketebalan utk cari titik tengah (centroid y_center)
        let totalThickness = 0;
        for (let layer of layers) {
            totalThickness += layer.thickness;
        }

        // krn hrs simetris, neutral axis pasti ada di tengah (y_center = totalThickness / 2)
        let y_center = totalThickness / 2;

        let topY = totalThickness;
        for (let i = 0; i < layers.length; i++) {
            let layer = layers[i];
            let { E, G } = this.getLayerModuli(layer);

            let t = layer.thickness;
            let a = 192.5 - (i * 35);

            let A = this.b_eff * t;
            let I = this.b_eff * Math.pow(t, 3) / 12;

            let E_I = E * I;
            let E_A_a2 = E * A * Math.pow(a, 2);

            let layerProp = new CLTLayerPropertiesType(i + 1, E, A, I, a, E_I, E_A_a2);
            result.layers.push(layerProp);

            result.EI_eff += (E_I + E_A_a2);

            topY -= t;
        }

        return result;
    }
}

class GammaMethod extends PanelProperties {
    calculate(cltLayup) {
        const layers = cltLayup.getLayers();
        if (layers.length !== 3 && layers.length !== 5) {
            throw new Error("Metode Gamma hanya dapat memproses susunan 3 atau 5 layer.");
        }

        let result = new PanelPropertiesType();

        let totalThickness = 0;
        for (let layer of layers) {
            totalThickness += layer.thickness;
        }

        let y_center = totalThickness / 2;
        let L = cltLayup.length;

        let topY = totalThickness;

        for (let i = 0; i < layers.length; i++) {
            let layer = layers[i];
            let { E, G } = this.getLayerModuli(layer);

            let t = layer.thickness;
            let center_y = topY - (t / 2);
            let a = center_y - y_center;

            let A = this.b_eff * t;
            let I = this.b_eff * Math.pow(t, 3) / 12;

            let gamma = 1.0;
            if (E > 0) {
                let middle_index = Math.floor(layers.length / 2);
                // Hanya hitung gamma untuk layer major yang BUKAN layer tengah
                if (i !== middle_index) {
                    let adjacent_minor_index = (i < middle_index) ? i + 1 : i - 1;
                    let cross_layer = layers[adjacent_minor_index];
                    let d_i = cross_layer.thickness;
                    let G_R = cross_layer.materialGrade.G_90; // Rolling shear modulus
                    
                    let fraction1 = (Math.pow(Math.PI, 2) * E * A) / Math.pow(L, 2);
                    let fraction2 = d_i / (G_R * this.b_eff);
                    gamma = 1 / (1 + (fraction1 * fraction2));
                }
            }

            let E_I = E * I;
            let E_A_a2 = gamma * E * A * Math.pow(a, 2);

            let layerProp = new CLTLayerPropertiesType(i + 1, E, A, I, a, E_I, E_A_a2);
            layerProp.gamma = gamma;
            result.layers.push(layerProp);

            result.EI_eff += (E_I + E_A_a2);

            topY -= t;
        }

        return result;
    }
}
