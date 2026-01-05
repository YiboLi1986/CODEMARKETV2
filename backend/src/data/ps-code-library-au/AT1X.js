// Define Inputs
// Definition of the inputs: units, parameters, streams, properties
// Get a value from the cache if it already exists, or create it if it doesn't exist
// @param key The unique key associated with the data to retrieve from the cache
// @param create A function to create the data if it does not yet exist
// getOrSet(key, create): any;
const config = UnitCache.getOrSet("CONFIG", () => {
    const poolconfig = {
        cduUnit: "Physical AT tower #1",
        visbreakerUnit: "VISBREAKER",
        fccuUnit: "FCCU",
        thisUnit: "AT1X",
        constantsUnit: "Constants",
        rpscapsUnit: "RPS_CAPS"
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
        inputArray.push(`Units.${poolconfig.constantsUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.fccuUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.visbreakerUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.thisUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.cduUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.rpscapsUnit}.Parameters`);
        // 'Physical AT tower #1' yield stream rates
        inputArray.push(`Streams.Physical AT tower #1-S13.Volume`);
        inputArray.push(`Streams.Physical AT tower #1-S33.Volume`);
        inputArray.push(`Streams.Physical AT tower #1-#1 STOVE.Volume`);
        inputArray.push(`Streams.Physical AT tower #1-DIESEL.Volume`);
        inputArray.push(`Streams.Physical AT tower #1-S43.Volume`);
        // stream properties
        inputArray.push(`Streams.Physical AT tower #1-S13.Properties.FRI`);
        inputArray.push(`Streams.Physical AT tower #1-#1 STOVE.Properties.FRI`);
        inputArray.push(`Streams.Physical AT tower #1-S33.Properties.FRI`);
        // 'Physical AT tower #1' feed rate and feed crude composition
        inputArray.push(`Streams.Physical AT tower #1-Feed.Volume`);
        inputArray.push(`Streams.Physical AT tower #1-Feed.Composition`);
        
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

// Definition of the constants (conversion factors) from the AUS unit 'Constants'.
const KPITOPSI = unitParameters(config.constantsUnit)["kPa to PSI factor"].Value;
const FRITOFRZA = unitParameters(config.constantsUnit)["FRI to FRZ parameter A"].Value;
const FRITOFRZB = unitParameters(config.constantsUnit)["FRI to FRZ parameter B"].Value;
const m3ToBBL = unitParameters(config.constantsUnit)["m3 to barrel factor"].Value;

// LSRN/SRN Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["LSRN/SRN swing up (%)"] != undefined) {
    const LSRN_SRN_swing_up = unitParameters(config.thisUnit)["LSRN/SRN swing control % up"].Value;
    const LSRNdraw = unitParameters(config.thisUnit)["LSRN draw"].Value;
    // Input value for swing % up.    
    let cutPpercSwingUp = unitParameters(config.thisUnit)["LSRN/SRN swing up (%)"].Value;
    // Calculation for Swing Up.
    // Check if parameter 'LSRN/SRN swing up (%)' will be used.
    // If 'Yes'
    if (LSRN_SRN_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["LSRN/SRN swing up (%)"].Value;
    }
    // If 'No', check another parameter to Maximise or Minimise Swing Up.
    else{
        if (LSRNdraw == "Maximised"){
            cutPpercSwingUp = 100;
        }
        else{
            cutPpercSwingUp = 0;
        }
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter LSRN-SRN1.Parameters.S-LSRN-SRN1-M-LSRN1"] = cutPpercSwingUp;
    objOutput["Units.Splitter LSRN-SRN1.Parameters.S-LSRN-SRN1-M-SRN1"] = cutPpercSwingDown;
}

// SRN/Stove Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["SRN/Stove swing up (%)"] != undefined) {
    // Reading Limit Range for the Swing
    const cutParamMin = unitParameters(config.rpscapsUnit)["CDU-1SRN/Stove Swing Cut"]?.Minimum;
    const cutParamMax = unitParameters(config.rpscapsUnit)["CDU-1SRN/Stove Swing Cut"]?.Maximum;
    const SRN_STOVE_swing_up = unitParameters(config.thisUnit)["SRN/Stove swing control % up"].Value;
    // 'AA2 Top' input values
    const AA2TOPTemp = unitParameters(config.thisUnit)["AA2 Top temperature (225-250 dgF)"].Value;
    const AA2TOPTempMin = unitParameters(config.thisUnit)["AA2 Top temperature (225-250 dgF)"].Minimum;
    const AA2TOPTempMax = unitParameters(config.thisUnit)["AA2 Top temperature (225-250 dgF)"].Maximum;
    // Input value for swing % up.
    let cutPpercSwingUp = unitParameters(config.thisUnit)["SRN/Stove swing up (%)"].Value;
    // Calculation for Swing Up.
    // Check if parameter 'SRN/Stove swing up (%)' will be used.
    // If 'Yes'
    if (SRN_STOVE_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["SRN/Stove swing up (%)"].Value;
    }
    // If 'No', 'AA2 Top' parameters will be used to calculate Swing Up.
    else{
        const calcECP = Math.max(Math.min(AA2TOPTempMin+(AA2TOPTempMax-AA2TOPTempMin)*(AA2TOPTemp-cutParamMin)/(cutParamMax-cutParamMin),cutParamMax),cutParamMin);
        cutPpercSwingUp = ((Math.max(0,calcECP-cutParamMin))/(cutParamMax - cutParamMin))*100;
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter SRN-STOVE1.Parameters.S-SRN-STOVE1-M-SRN1"] = cutPpercSwingUp;
    objOutput["Units.Splitter SRN-STOVE1.Parameters.S-SRN-STOVE1-M-STOVE1"] = cutPpercSwingDown;
}

// Stove/Diesel Swing calculation and targeting 'Freeze point' property.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["Stove/Diesel swing up (%)"] != undefined) {
    // Input value for swing % up.
    let cutPpercSwingUp = unitParameters(config.thisUnit)["Stove/Diesel swing up (%)"].Value;
    const STOVE_DIESEL_swing_up = unitParameters(config.thisUnit)["Stove/Diesel swing control % up"].Value;
    // Freeze point target value (input).
    const JET_STOVE_FRZP = unitParameters(config.thisUnit)["JET/STOVE Freeze point (dgC)"].Value;
    // 'Physical AT tower #1-S13' rate M3/Day and conversion to BBL/Day
    const swingSRNSTOVE = dataIn[`Streams.Physical AT tower #1-S13.Volume`];
    const swingSTOVEDIESEL_BBL = dataIn[`Streams.Physical AT tower #1-S33.Volume`]*m3ToBBL;
    // Reading calculated 'S-SRN-STOVE1-M-STOVE1' % from the 'objOutput' and converting to rate BBL/Day. 
    const swingSRNToStove_BBL = (swingSRNSTOVE*objOutput["Units.Splitter SRN-STOVE1.Parameters.S-SRN-STOVE1-M-STOVE1"]/100)*m3ToBBL;
    // 'Physical AT tower #1-#1 STOVE' rate M3/Day and conversion to BBL/Day
    const cutSTOVE_BBL = dataIn[`Streams.Physical AT tower #1-#1 STOVE.Volume`]*m3ToBBL;
    // Reading 'Freeze point' property values for streams 'Physical AT tower #1-S13', 'Physical AT tower #1-S33', 'Physical AT tower #1-#1 STOVE'.
    const swingSRNSTOVE_FRI = dataIn[`Streams.Physical AT tower #1-S13.Properties.FRI`]??0;
    const swingSTOVEDIESEL_FRI = dataIn[`Streams.Physical AT tower #1-S33.Properties.FRI`]??0;
    const cutSTOVE_FRI = dataIn[`Streams.Physical AT tower #1-#1 STOVE.Properties.FRI`]??0;
    // Calculation for Swing Up.
    // Check if parameter 'Stove/Diesel swing up (%)' will be used.
    // If 'Yes'
    if (STOVE_DIESEL_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["Stove/Diesel swing up (%)"].Value
    }
    // If 'No', calculate swing to target 'Freeze point'.
    else{
        // Check if required cuts (SRN + Stove) > 0 and calculate target 'Freeze point'.
        if ((swingSRNToStove_BBL+cutSTOVE_BBL)>0){
            const TargetFRI = FRITOFRZA/(FRITOFRZB-JET_STOVE_FRZP)
            const friCalc = (swingSRNToStove_BBL*swingSRNSTOVE_FRI+cutSTOVE_BBL*cutSTOVE_FRI)/(swingSRNToStove_BBL+cutSTOVE_BBL);
            let stTojs_BPD = 0;
            // If calculated target 'Freeze point' < 'Freeze point' input parameter value, then calculates ST Diesel to Stove
            if (friCalc<TargetFRI){
                stTojs_BPD=Math.min(swingSTOVEDIESEL_BBL,Math.abs((((swingSRNToStove_BBL+cutSTOVE_BBL)*friCalc)-((swingSRNToStove_BBL+cutSTOVE_BBL)*TargetFRI))/(TargetFRI-swingSTOVEDIESEL_FRI)));
            }
             cutPpercSwingUp = (stTojs_BPD/swingSTOVEDIESEL_BBL)*100;
        
        }else{
            cutPpercSwingUp = 0;
        }
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter ST-DIESEL1.Parameters.S-STOVE-DIESEL1-M-STOVE1"] = cutPpercSwingUp;
    objOutput["Units.Splitter ST-DIESEL1.Parameters.S-STOVE-DIESEL1-M-DIESEL1"] = cutPpercSwingDown;
}

// Diesel/MGO Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["Diesel/MGO swing up (%)"] != undefined) {
    let cutPpercSwingUp = 0;
    // Input values. 
    const DIESEL_MGO_swing_up = unitParameters(config.thisUnit)["Diesel/MGO swing control % up"].Value;
    const DIESELdraw = unitParameters(config.thisUnit)["DIESEL draw (bpd)"].Value;
    // Stream rates
    const dieselSwing = dataIn[`Streams.Physical AT tower #1-S33.Volume`]*objOutput["Units.Splitter ST-DIESEL1.Parameters.S-STOVE-DIESEL1-M-DIESEL1"]/100;
    const dieselCut = dataIn[`Streams.Physical AT tower #1-DIESEL.Volume`]
    const mgoSwing = dataIn[`Streams.Physical AT tower #1-S43.Volume`]

    // Calculation for Swing Up.
    // Check if parameter 'Diesel/MGO swing up (%)' will be used.
    // If 'Yes'
    if (DIESEL_MGO_swing_up == "Yes"){
        cutPpercSwingUp = unitParameters(config.thisUnit)["Diesel/MGO swing up (%)"].Value
    }
    // If 'No', calculate swing with remain quantity.
    else{
        const stoveDieselTotal = (dieselSwing+dieselCut)*m3ToBBL;
        if (stoveDieselTotal < DIESELdraw && mgoSwing!=0){
            cutPpercSwingUp = (Math.min(mgoSwing*m3ToBBL,DIESELdraw-stoveDieselTotal)/m3ToBBL)/mgoSwing*100;
        }
    }
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter DIESEL-MGO1.Parameters.S-DIESEL-MGO1-M-DIESEL1"] = cutPpercSwingUp;
    objOutput["Units.Splitter DIESEL-MGO1.Parameters.S-DIESEL-MGO1-MGO1 Swing Mixer"] = cutPpercSwingDown;
}

// MGO/LVD Swing calculation.
// Calculate only if the input value exists.
if (unitParameters(config.thisUnit)["MGO/LVD swing up (%)"] != undefined) {
    const cutPpercSwingUp = unitParameters(config.thisUnit)["MGO/LVD swing up (%)"].Value;
    // Calculation for Swing Down.
    const cutPpercSwingDown = 100 - cutPpercSwingUp;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.MGO/LVD1 Splitter.Parameters.MGO/LVD1 Splitter-MGO1 Swing Mixer"] = cutPpercSwingUp;
    objOutput["Units.MGO/LVD1 Splitter.Parameters.MGO/LVD1 Splitter-LVD1 Swing Mixer"] = cutPpercSwingDown;
}

// Logic: VBU Gasoil and Naphtha streams routing

// VBU streams (Gasoil and Naphtha) routing
// Calculate only if the input value exists.
if (unitParameters(config.visbreakerUnit)["Gasoil routing"] != undefined) {
    // VBU product control Gasoil routing (100% or 0%)
    const gasoilRouting = unitParameters(config.visbreakerUnit)["Gasoil routing"].Value
    // to FCCU
    if (gasoilRouting == "FCCU"){
        // Save calcualtion results to the object 'objOutput'
        objOutput["Units.Splitter VBU Gasoil.Parameters.M-VBG-FCC"] = 100;
    }
    // to Residue Tanks
    else{
        // Save calcualtion results to the object 'objOutput'
        objOutput["Units.Splitter VBU Gasoil.Parameters.M-VBG-FCC"] = 0;
    }
    // VBU product control Naphtha routing (100% or 0%)
    // Calculate only if the input value exists.
    if (unitParameters(config.fccuUnit)["Intake"] != undefined) {
        if (unitParameters(config.fccuUnit)["Intake"].Value > 0) {
            const naphthaRouting = unitParameters(config.visbreakerUnit)["Naphtha routing"].Value
            // to FCCU
            if (naphthaRouting == "FCCU"){
                // Save calcualtion results to the object 'objOutput'
                objOutput["Units.Splitter VBU Naphtha.Parameters.M-VBT-FCC"] = 100;
            }
            // to 'Physical AT tower #1' (Recyle)
            else{
                // Save calcualtion results to the object 'objOutput'
                objOutput["Units.Splitter VBU Naphtha.Parameters.M-VBT-FCC"] = 0;
            }
        }
    }
}

// Logic: 'Physical AT tower #1' Feed by Crude Type

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

// 'Physical AT tower #1' Feed Rate
const cdu1FeedM3 = dataIn[`Streams.Physical AT tower #1-Feed.Volume`];

// Searching crudes and adding values to totalSourCrude
let totalSourCrude = 0;
for (let i = 0; i < sourCrude.length; i++) {
    const crudeName = sourCrude[i];
    totalSourCrude += (dataIn[`Streams.Physical AT tower #1-Feed.Composition`][`${crudeName}`]??0)*cdu1FeedM3;
 }

// Searching crudes and adding values to totalSyntheticCrude
let totalSyntheticCrude = 0;
for (let i = 0; i < syntheticCrude.length; i++) {
    const crudeName = syntheticCrude[i];
    totalSyntheticCrude += (dataIn[`Streams.Physical AT tower #1-Feed.Composition`][`${crudeName}`]??0)*cdu1FeedM3;
}

// Searching crudes and adding values to totalSweetCrude
let totalSweetCrude = 0;
for (let i = 0; i < sweetCrude.length; i++) {
    const crudeName = sweetCrude[i];
    totalSweetCrude += (dataIn[`Streams.Physical AT tower #1-Feed.Composition`][`${crudeName}`]??0)*cdu1FeedM3;
}

// Save calcualtion results to the object 'objOutput'
objOutput["Streams.AT1X-SourCrude.Volume"] = totalSourCrude;
objOutput["Streams.AT1X-SyntheticCrude.Volume"] = totalSyntheticCrude;
objOutput["Streams.AT1X-SweetCrude.Volume"] = totalSweetCrude;

// Results
// Set simulator variable data
// @param data An object with string keys representing variable paths.
// setData(data: { [key: string]: any }): void;
Simulator.setData(objOutput);
