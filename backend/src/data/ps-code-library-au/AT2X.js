// Define Inputs
// Definition of the inputs: units, parameters, streams, properties
// Get a value from the cache if it already exists, or create it if it doesn't exist
// @param key The unique key associated with the data to retrieve from the cache
// @param create A function to create the data if it does not yet exist
// getOrSet(key, create): any;
const config = UnitCache.getOrSet("CONFIG", () => {
    const poolconfig = {
        cduunit: "Physical AT tower #2",
        thisUnit: "AT2X",
        constantsUnit: "Constants",
        rpscapsUnit: "RPS_CAPS",
        dihParams : {"% Swing Up - DIH Tops/Btms" : ["LM1"]}
    }

// DataRequest class for efficiently requesting data multiple times. Should be used if the same set of variable requests will be made at multiple simulation periods.
// @param key The request key, should be unique within the custom unit script
// @param build The function to generate the list of variables to retreive in the request
// constructor(key: string, build: () => string[]);
// Execute the data request.
// execute(): { [key: string]: any };

    const request = new DataRequest("Inputs", () => {
        const inputArray = [];
        // parameters
        inputArray.push(`Units.${poolconfig.thisUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.cduunit}.Parameters`);
        inputArray.push(`Units.${poolconfig.constantsUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.rpscapsUnit}.Parameters`);
        // 'Physical AT tower #2' yield stream rates
        inputArray.push(`Streams.Physical AT tower #2-S14.Volume`);
        inputArray.push(`Streams.Physical AT tower #2-HEAVY NAPHTH2.Volume`);
        inputArray.push(`Streams.Physical AT tower #2-S24.Volume`);
        // 'Physical AT tower #2' feed rate and feed crude composition
        inputArray.push(`Streams.Physical AT tower #2-Feed.Volume`);
        inputArray.push(`Streams.Physical AT tower #2-Feed.Composition`);

        return inputArray;
    });
    return {

        request: request,
        ...poolconfig
    }
});

// Simulation input data defined in the object 'config' is in the object 'dataIn'.
const dataIn = config.request.execute();

// Logic: Swing Calculation

// Input Parameters object.
const unitParameters = (unit) => dataIn[`Units.${unit}.Parameters`];

// Object for the results.
const objOutput = {};

// Definition of the constants (conversion factors) from the AUS unit 'Constants'
const KPITOPSI = unitParameters(config.constantsUnit)["kPa to PSI factor"].Value
const FRITOFRZA = unitParameters(config.constantsUnit)["FRI to FRZ parameter A"].Value
const FRITOFRZB = unitParameters(config.constantsUnit)["FRI to FRZ parameter B"].Value
const m3ToBBL = unitParameters(config.constantsUnit)["m3 to barrel factor"].Value

// LSRN/SRN Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["LSRN/SRN swing up (%)"] != undefined) {
    let cutPpercSwingUp = 0;
    const LSRN_SRN_swing_up = unitParameters(config.thisUnit)["LSRN/SRN swing control % up"].Value;
    const LSRNdraw = unitParameters(config.thisUnit)["LSRN draw"].Value;
    // Calculation for Swing Up.
    // Check if parameter 'LSRN/SRN swing up (%)' will be used.
    // If 'Yes'    
    if (LSRN_SRN_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["LSRN/SRN swing up (%)"].Value
    }
    // If 'No', check another parameter to Maximise or Minimise Swing Up.
    else{
        if (LSRNdraw == "Maximised"){
            cutPpercSwingUp = 100
        }
        else{
            cutPpercSwingUp = 0
        }
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter LSRN-SRN2.Parameters.S-LSRN-SRN2-M-LSRN2"] = cutPpercSwingUp;
    objOutput["Units.Splitter LSRN-SRN2.Parameters.S-LSRN-SRN2-M-SRN2"] = cutPpercSwingDown;
}

// SRN/HN Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["SRN/HN swing up (%)"] != undefined) {
    let cutPpercSwingUp = 0;
    // Reading Limit Range for the Swing
    const cutParamMin = unitParameters(config.rpscapsUnit)["CDU-2SRN/Hy NA Swing Cut"]?.Minimum
    const cutParamMax = unitParameters(config.rpscapsUnit)["CDU-2SRN/Hy NA Swing Cut"]?.Maximum
    const SRN_HN_swing_up = unitParameters(config.thisUnit)["SRN/HN swing control % up"].Value;
    // 'SRN T90' input values and limits
    const SRNT90 = unitParameters(config.thisUnit)["SRN T90 (120-170 dgC)"].Value;
    const SRNT90Min = unitParameters(config.thisUnit)["SRN T90 (120-170 dgC)"].Minimum;
    const SRNT90Max = unitParameters(config.thisUnit)["SRN T90 (120-170 dgC)"].Maximum;
    // Calculation for Swing Up.
    // Check if parameter 'SRN/HN swing up (%)' will be used.
    // If 'Yes'
    if (SRN_HN_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["SRN/HN swing up (%)"].Value;
    }
    // If 'No', 'SRN T90' parameters will be used to calculate Swing Up.
    else{
        const calcECP = Math.max(Math.min(SRNT90Min+(SRNT90Max-SRNT90Min)*(SRNT90-cutParamMin)/(cutParamMax-cutParamMin),cutParamMax),cutParamMin)
        cutPpercSwingUp = ((Math.max(0,calcECP-cutParamMin))/(cutParamMax - cutParamMin))*100
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter SRN-HYNA2.Parameters.S-SRN-HYNA2-M-SRN2"] = cutPpercSwingUp;
    objOutput["Units.Splitter SRN-HYNA2.Parameters.S-SRN-HYNA2-M-HYNA"] = cutPpercSwingDown;
}

// HN/Stove Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["HN/Stove swing up (%)"] != undefined) {
    let cutPpercSwingUp = 0;
    const HN_STOVE_swing_up = unitParameters(config.thisUnit)["HN/Stove swing control % up"].Value;
    const jetHNUser = unitParameters(config.thisUnit)["JET/HN draw (bpd)"].Value;
    // Calcualtion 'S-SRN-HYNA2-M-HYNA' stream
    const srnHNSwing = objOutput["Units.Splitter SRN-HYNA2.Parameters.S-SRN-HYNA2-M-HYNA"]*dataIn[`Streams.Physical AT tower #2-S14.Volume`]/100*m3ToBBL;
    const hnCut = dataIn[`Streams.Physical AT tower #2-HEAVY NAPHTH2.Volume`]*m3ToBBL;
    const hnStoveSwing = dataIn[`Streams.Physical AT tower #2-S24.Volume`]*m3ToBBL;
    // Calculation for Swing Up.
    // Check if parameter 'HN/Stove swing up (%)' will be used.
    // If 'Yes'
    if (HN_STOVE_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["HN/Stove swing up (%)"].Value;
    }
    // If 'No', check another parameter 'JET/HN draw (bpd)' to target rate.
    else{
        // Check if user input parameter < available rate
        if (srnHNSwing+hnCut<jetHNUser && hnStoveSwing!=0){
            cutPpercSwingUp = (Math.min(hnStoveSwing,jetHNUser-(srnHNSwing+hnCut))/hnStoveSwing)*100;
        }
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter HYNA-STOVE2.Parameters.S-HYNA-STOVE2-M-HYNA"] = cutPpercSwingUp;
    objOutput["Units.Splitter HYNA-STOVE2.Parameters.S-HYNA-STOVE2-M-STOVE2"] = cutPpercSwingDown;
}

// Stove/Diesel Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["Stove/Diesel swing up (%)"] != undefined) {
    let cutPpercSwingUp = 0;
    const STOVE_DIESEL_swing_up = unitParameters(config.thisUnit)["Stove/Diesel swing control % up"].Value;
    const STOVE_T90 = unitParameters(config.thisUnit)["Stove T90 (275-314 dgC)"].Value;
    const cutParamMin = unitParameters(config.rpscapsUnit)["CDU-2Stove/Diesel Swing Cut"]?.Minimum
    const cutParamMax = unitParameters(config.rpscapsUnit)["CDU-2Stove/Diesel Swing Cut"]?.Maximum
    const STOVET90Min = unitParameters(config.thisUnit)["Stove T90 (275-314 dgC)"].Minimum
    const STOVET90Max = unitParameters(config.thisUnit)["Stove T90 (275-314 dgC)"].Maximum;
    // Calculation for Swing Up.
    // Check if parameter 'Stove/Diesel swing up (%)' will be used.
    // If 'Yes'
    if (STOVE_DIESEL_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["Stove/Diesel swing up (%)"].Value;
    }
    // If 'No', calculate swing to target 'ECP'.
    else{
        const calcECP = Math.max(Math.min(STOVET90Min+(STOVET90Max-STOVET90Min)*(STOVE_T90-cutParamMin)/(cutParamMax-cutParamMin),cutParamMax),cutParamMin)
        cutPpercSwingUp = ((Math.max(0,calcECP-cutParamMin))/(cutParamMax - cutParamMin))*100
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter ST-DIESEL2.Parameters.S-STOVE-DIESEL2-M-STOVE2"] = cutPpercSwingUp;
    objOutput["Units.Splitter ST-DIESEL2.Parameters.S-STOVE-DIESEL2-M-DIESEL2"] = cutPpercSwingDown;
}

// Diesel/MGO Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["Diesel/MGO swing up (%)"] != undefined) {
    let cutPpercSwingUp = 0;
    // Input values. 
    const Dieseldraw = unitParameters(config.thisUnit)["DIESEL draw (bpd)"].Value;
    const Diesel_MGO_swing_up = unitParameters(config.thisUnit)["Diesel/MGO swing control % up"].Value;
    // Calculation for Swing Up.
    // Check if parameter 'Diesel/MGO swing up (%)' will be used.
    // If 'Yes'
    if (Diesel_MGO_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["Diesel/MGO swing up (%)"].Value;
    }
    // If 'No', check another parameter to Maximise or Minimise Swing Up.
    else{
        if (Dieseldraw=="Maximised"){
            cutPpercSwingUp = 100;
        }
        else{
            cutPpercSwingUp = 0;
        }
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter DIESEL-MGO2.Parameters.S-DIESEL-MGO2-M-DIESEL2"] = cutPpercSwingUp;
    objOutput["Units.Splitter DIESEL-MGO2.Parameters.S-DIESEL-MGO2-MGO2 Swing Mixer"] = cutPpercSwingDown;
}

// MGO/LVD Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["MGO/LVD swing up (%)"] != undefined) {
    // Input values. 
    const MGOdraw = unitParameters(config.thisUnit)["MGO draw"].Value;
    const MGO_LVD_swing_up = unitParameters(config.thisUnit)["MGO/LVD swing control % up"].Value;
    let cutPpercSwingUp = 0;
    // Calculation for Swing Up.
    // Check if parameter 'MGO/LVD swing up (%)' will be used.
    // If 'Yes'
    if (MGO_LVD_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["MGO/LVD swing up (%)"].Value;
    }
    // If 'No', check another parameter to Maximise or Minimise Swing Up.
    else{
        if (MGOdraw=="Maximised"){
            cutPpercSwingUp = 100;
        }
        else{
            cutPpercSwingUp = 0;
        }
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.MGO/LVD2 Splitter.Parameters.MGO/LVD2 Splitter-MGO2 Swing Mixer"] = cutPpercSwingUp;
    objOutput["Units.MGO/LVD2 Splitter.Parameters.MGO/LVD2 Splitter-LVD2 Swing Mixer"] = cutPpercSwingDown;
}

// Logic: 'Physical AT tower #2' Feed by Crude Type

// Sour Crudes Array
const sourCrude = [
    "BOW RIVER",
    "CAROLINE CONDENSATE",
    "COLD LAKE",
    "ENBRIDGE SOUR LIGHT",
    "ENBRIDGE SOUR HEAVY",
    "FOSTERTON",
    "KOCH ALBERTA",
    "LLOYDMINSTER",
    "LIGHT SOUR BLEND",
    "MIDALE",
    "MEDIUM SOUR BLEND"];

// Synthetic Crudes Array
const syntheticCrude = [
    "SYN",
    "NSA",
    "PSX",
    "PSY",
    "SSX",
    "ALBIAN HVY SYNTH",
    "HSC",
    "SPX"]

// Sweet Crudes Array
const sweetCrude = [
    "BRENT",
    "BAKKEN",
    "CANADIAN MIXED SWEET",
    "WTI CUSHING",
    "MICHIGAN LIGHT",
    "NORTH DAKOTA SWEET",
    "PLAINS CONDENSATE",
    "PIPELINE INTERFACE",
    "UTICA"]

// 'Physical AT tower #2' Feed Rate
const cdu2FeedM3 = dataIn[`Streams.Physical AT tower #2-Feed.Volume`];

// Searching crudes and adding values to totalSourCrude
let totalSourCrude = 0;
for (let i = 0; i < sourCrude.length; i++) {
    const crudeName = sourCrude[i];
    totalSourCrude += (dataIn[`Streams.Physical AT tower #2-Feed.Composition`][`${crudeName}`]??0)*cdu2FeedM3;
 }

// Searching crudes and adding values to totalSyntheticCrude
let totalSyntheticCrude = 0;
for (let i = 0; i < syntheticCrude.length; i++) {
    const crudeName = syntheticCrude[i];
    totalSyntheticCrude += (dataIn[`Streams.Physical AT tower #2-Feed.Composition`][`${crudeName}`]??0)*cdu2FeedM3;
}

// Searching crudes and adding values to totalSweetCrude
let totalSweetCrude = 0;
for (let i = 0; i < sweetCrude.length; i++) {
    const crudeName = sweetCrude[i];
    totalSweetCrude += (dataIn[`Streams.Physical AT tower #2-Feed.Composition`][`${crudeName}`]??0)*cdu2FeedM3;
}

// Save calcualtion results to the object 'objOutput'
objOutput["Streams.AT2X-SourCrude.Volume"] = totalSourCrude;
objOutput["Streams.AT2X-SyntheticCrude.Volume"] = totalSyntheticCrude;
objOutput["Streams.AT2X-SweetCrude.Volume"] = totalSweetCrude;

// Results
// Set simulator variable data
// @param data An object with string keys representing variable paths.
// setData(data: { [key: string]: any }): void;
Simulator.setData(objOutput);
