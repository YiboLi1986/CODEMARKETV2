
# Submitter
Wu, WeiWei
# Email
weiwei.wu@aspentech.com
# Version
14
# Technical Description
This logical unit reads deferred cuts from the Crude Unit Assay 'Physical AT tower #1' and saving to the streams ("VU#1-LV1","AT#1-HVD Pre-Offset","AT#1-VAC RESID Pre-Offset").
Deferred cuts can only be read via Java Script.
The purpose of this operation is to obtain the yields/properties/services of the Vacuum unit, which are located in the Assays, and write the values ​​into the streams for further use in the AUS.
# Business Description
The vacuum unit separates the atmospheric residue output from the atmospheric tower unit into heavy fractions: light vacuum distillate, heavy vacuum distillate and vacuum residue. Sometimes the modeling technique involves including these fractions in the Assay as Deffered Cuts. One reason may be to obtain cuts without the influence of swings. In this case, the only way to obtain Deffered Cuts is to use the methods in the Java Script.

# Code
```js
// Define Inputs
// Definition of the inputs: units, streams
// Get a value from the cache if it already exists, or create it if it doesn't exist
// @param key The unique key associated with the data to retrieve from the cache
// @param create A function to create the data if it does not yet exist
// getOrSet(key, create): any;
const config = UnitCache.getOrSet("CONFIG", () => {
    const poolconfig = {
        crudeUnit: "Physical AT tower #1",
        streamsOut: ["VU#1-LV1","AT#1-HVD Pre-Offset","AT#1-VAC RESID Pre-Offset"],
        service: ["LVD","HVD","VAC RESID"],
        cutsIn: ["LVD","HVD","VAC RESID"]
    }
    
// DataRequest class for efficiently requesting data multiple times. Should be used if the same set of variable requests will be made at multiple simulation periods.
// @param key The request key, should be unique within the custom unit script
// @param build The function to generate the list of variables to retreive in the request
// constructor(key: string, build: () => string[]);
// Execute the data request.
// execute(): { [key: string]: any };

    const request = new DataRequest("Inputs", () => {
        const inputArray = [];
        // Getting cut and properties from the config.cutsIn array
        for (let i = 0; i < config.cutsIn.length; i++) {
            const cut = config.cutsIn[i];
            inputArray.push(`Units.${config.crudeUnit}.DeferredCut.${cut}`);
            inputArray.push(`Units.${config.crudeUnit}.DeferredCut.${cut}.Properties`);
        }
        return inputArray;
    });
    return {
        request: request,
        ...poolconfig
    }
});

// Simulation input data defined in the object 'config' is in the object 'dataIn'.
const dataIn = config.request.execute();

// Logic: Calculation Vacuum Unit Yields from Assays deferred cuts

// Object for the results.
const objOutput = {}

// Save calcualtion results (service/rate/properties) to the object 'objOutput' for each stream in the config.streamsOut.
for (let i = 0; i < config.streamsOut.length; i++) {
    const streamOut = config.streamsOut[i];
    const cut = config.cutsIn[i];
    const srvc = config.service[i];
    objOutput[`Streams.${streamOut}.Service`] = srvc;
    objOutput[`Streams.${streamOut}.Volume`] = dataIn[`Units.${config.crudeUnit}.DeferredCut.${cut}`]?.[0] ?? 0.0;
    objOutput[`Streams.${streamOut}.Properties`] = dataIn[`Units.${config.crudeUnit}.DeferredCut.${cut}.Properties`];
}
// Assigning 0 value to the '%CK' property of 'VU#1-LV1' stream and save calcualtion results to the object 'objOutput'
objOutput[`Streams.VU#1-LV1.Properties.%CK`] = 0;

// Results
// Set simulator variable data
// @param data An object with string keys representing variable paths.
// setData(data: { [key: string]: any }): void;
Simulator.setData(objOutput);
```