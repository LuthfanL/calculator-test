class CLTLayupType {
    constructor(length = 5000) {
        this.name = 'CLT Layup';
        /**
         * @type {CLTLayerType[]}
         */
        this.layers = [];
        this.length = length; 
    }
    
    addLayer(layer) {
        this.layers.push(layer);
    }
    
    getLayers() {
        return this.layers;
    }
    
    isSymmetric() {
        const len = this.layers.length;
        if (len === 0) return false;
        
        for (let i = 0; i < Math.floor(len / 2); i++) {
            let top = this.layers[i];
            let bottom = this.layers[len - 1 - i];
            
            if (top.thickness !== bottom.thickness || 
                top.orientation !== bottom.orientation || 
                top.materialGrade.name !== bottom.materialGrade.name) {
                return false;
            }
        }
        return true;
    }
}