// Define Inputs
// Definition of the inputs: units, parameters (units and offsetUnitParams), streams (offSetUnitFeeds and offSetUnitProds), properties, default services (materialservices), composition
// Get a value from the cache if it already exists, or create it if it doesn't exist
// @param key The unique key associated with the data to retrieve from the cache
// @param create A function to create the data if it does not yet exist
// getOrSet(key, create): any;
const config = UnitCache.getOrSet("CONFIG", () => {
    const poolconfig = {
        offsetUnit: "AT Tower#2 Offset",
        constantsUnit: "Constants",
        rps_capsUnit: "RPS_CAPS",
        mainUnit: "Physical AT tower #2",
        rOffUnit: "ROFF",
        at2xUnit: "AT2X",
        dihxUnit: "DIHX",
        drlxUnit: "DRLX",
        offSetUnitFeeds: [
            "AT#2-LPG Pre-Offset",
            "DIT2",
            "DW2",
            "DIB2",
            "AT#2-LSRN Pre-Offset", 
            "AT#2-SRN Pre-Offset",
            "AT#2-HY NA Pre-Offset", 
            "AT#2-STOVE Pre-Offset", 
            "AT#2-DIESEL Pre-Offset", 
            "AT#2-MGO Pre-Offset",
            "AT#2-LVD Pre-Offset",
            "AT#2-HVD Pre-Offset",
            "AT#2-VAC RESID Pre-Offset"],
        offSetUnitProds: [
            "AT#2-LPG",
            "DT2B",
            "DW2B",
            "DB2B",
            "AT#2-LSRN", 
            "AT#2-SRN",
            "AT#2-HY NA", 
            "AT#2-STOVE", 
            "AT#2-DIESEL", 
            "AT#2-MGO",
            "AT#2-LVD",
            "AT#2-HVD",
            "AT#2-VAC RESID"],
        offsetUnitParams: [
            "Offset LPG (wgt% of feed)", 
            "Offset LSRN (wgt% of feed)",
            "Offset LSRN (wgt% of feed)",
            "Offset LSRN (wgt% of feed)",
            "Offset LSRN (wgt% of feed)", 
            "Offset SRN (wgt% of feed)",
            "Offset Hy NA (wgt% of feed)",  
            "Offset Stove (wgt% of feed)", 
            "Offset Diesel (wgt% of feed)", 
            "Offset MGO (wgt% of feed)", 
            "Offset LVD (wgt% of feed)", 
            "Offset HVD (wgt% of feed)",
            "Offset Vac bottoms (wgt% of feed)"],
        materialservices: [
            "C3",
            "DTP DIH TOPS",
            "DIH SWING",
            "DBT DIH BTM",
            "#1 LSR2", 
            "SR2",
            "HEAVY NAPHTH2", 
            "STOV2", 
            "DIESE2", 
            "MG2", 
            "LV2", 
            "Hv2",
            "VAC RESI2"]
    }

// DataRequest class for efficiently requesting data multiple times. Should be used if the same set of variable requests will be made at multiple simulation periods.
// @param key The request key, should be unique within the custom unit script
// @param build The function to generate the list of variables to retreive in the request
// constructor(key: string, build: () => string[]);
// Execute the data request.
// execute(): { [key: string]: any };

    const request = new DataRequest("INPUTS", () => {
        const inputArray = [];
        // parameters
        inputArray.push(`Units.${poolconfig.constantsUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.rps_capsUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.offsetUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.dihxUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.at2xUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.drlxUnit}.Parameters`);
        // rates (Mass and Volume), Service, Properties, Composition
        for (let i = 0; i < poolconfig.offSetUnitFeeds.length; i++) {
            const stream = poolconfig.offSetUnitFeeds[i];
            inputArray.push(`Streams.${stream}.Mass`);
            inputArray.push(`Streams.${stream}.Volume`);
            inputArray.push(`Streams.${stream}.Service`);
            inputArray.push(`Streams.${stream}.Properties`);
            inputArray.push(`Streams.${stream}.Composition`);
        }
        // stream rates and properties
        inputArray.push(`Streams.AT#2-HY NA.Properties.Specific Gravity`);
        inputArray.push(`Streams.AT#2-HVD.Properties.Specific Gravity`);
        inputArray.push(`Streams.AT#2-VAC RESID.Properties.Specific Gravity`);
        inputArray.push(`Streams.AT#2-HY NA Pre-Offset.Volume`);
        
        inputArray.push(`Model.PeriodStart`);
        return inputArray;
    });
    return {
        request: request,
        ...poolconfig
    }
});

// Simulation input data defined in the object 'config' is in the object 'dataIn'.
const dataIn = config.request.execute();

//Make Output splitter as 0 to avoid previous simulation value carryover to current
const objOutput = {};

// Logic: Offsets

// Input Parameters object.
const unitParameters = (unit) => dataIn[`Units.${unit}.Parameters`];
// Input Stream objects (Mass and Volume).
const getStreamMass = (stream) => dataIn[`Streams.${stream}.Mass`] ?? 0.0;
const getStreamVolume = (stream) => dataIn[`Streams.${stream}.Volume`] ?? 0.0;

// Calculation of the Total Mass and Total Volume.
let mainUnitFeedRate = 0;
let mainUnitFeedRateVOL = 0;
for (let i = 0; i < config.offSetUnitFeeds.length; i++) {
    mainUnitFeedRate += getStreamMass(config.offSetUnitFeeds[i])
    mainUnitFeedRateVOL += getStreamVolume(config.offSetUnitFeeds[i])
}

// Coefficients for the conversion
const barToM3 = unitParameters(config.constantsUnit)["Barrel to m3 factor"].Value;
const m3ToBBL = unitParameters(config.constantsUnit)["m3 to barrel factor"].Value;

// Save calcualtion results ('CDU2 Total' BBL/Day) to the object 'objOutput'
objOutput[`Streams.CDU2 Total.Volume`] = mainUnitFeedRateVOL*m3ToBBL;

let totalOffsets = 0;

// Calculation offsets and copy properties/composition/service to the output streams
for (let j = 0; j < config.offSetUnitFeeds.length; j++) {
    // Input stream Rate Mass
    const preOffSetMass = getStreamMass(config.offSetUnitFeeds[j]);
    // Offset parameter for the stream
    const offsetParam = unitParameters(config.offsetUnit)[config.offsetUnitParams[j]]?.Value ?? 0;
    // Calcualtion Total offsets
    totalOffsets += offsetParam
    // Calculation offset value
    const postOffsetValue = (preOffSetMass + (mainUnitFeedRate * offsetParam) / 100)
    // Save calcualtion results (Mass) to the object 'objOutput'. Value will be > 0.
    objOutput[`Streams.${config.offSetUnitProds[j]}.Mass`] = Math.max(0, postOffsetValue);
    // Check if Unit Feed rate > 0. If 0, then only Properties and Services will be saved to results.
    if (mainUnitFeedRate > 0) {
        // Check if Service value is empty and if so, applies the default service. Save calcualtion results (Service) to the object 'objOutput'.
        if (dataIn[`Streams.${config.offSetUnitFeeds[j]}.Service`] == "")
        {
            objOutput[`Streams.${config.offSetUnitProds[j]}.Service`] = config.materialservices[j];
        }
        // Copy service from input to output stream. If input servic is null, applies the default service.
        else{
            objOutput[`Streams.${config.offSetUnitProds[j]}.Service`] = dataIn[`Streams.${config.offSetUnitFeeds[j]}.Service`] ?? config.materialservices[j];
        }
    }
    // Save calcualtion results (Properties and Composition) to the object 'objOutput'.
    objOutput[`Streams.${config.offSetUnitProds[j]}.Properties`] = dataIn[`Streams.${config.offSetUnitFeeds[j]}.Properties`];
    objOutput[`Streams.${config.offSetUnitProds[j]}.Composition`] = dataIn[`Streams.${config.offSetUnitFeeds[j]}.Composition`];

}

// If total offsets <> 0, saves the warning to the Log, so that users can see the total inbalance delta for the unit in the AUS UI.
if (totalOffsets != 0) {
    Log.warning(`Offsets Sum for '${config.mainUnit}' is not 0 and will cause mass imbalance across Unit'`);
}

// Logic: Calculation of AT Tower#2 Bottoms (AT#2-LVD, AT#2-HVD, AT#2-VAC RESID) to FCC unit
// 'Splitter Hvy Dist 2'

// Original stream rates (Mass) (AT#2-HVD, AT#2-VAC RESID). They are calculated above in the loop.
const HVDoffset = objOutput["Streams.AT#2-HVD.Mass"]??0;
const VRoffset = objOutput["Streams.AT#2-VAC RESID.Mass"]??0;
// Original stream rates (Mass) (AT#2-HVD, AT#2-VAC RESID). They are calculated above in the loop.
const HVDspg = objOutput["Streams.AT#2-HVD.Properties"]["Specific Gravity"]??0;
const VRspg = objOutput["Streams.AT#2-VAC RESID.Properties"]["Specific Gravity"]??0;

// Input parameters
// CDU-2 VacBottoms (constant)
const vr2Min = unitParameters(config.rps_capsUnit)["CDU-2 VacBottoms"]?.Value; 

let hd2vr2 = 0;
let vr2BBL = 0;
let hvd2BBL = 0;

// Check 'VRspg' to avoid division by zero
if (VRspg!=0){
    vr2BBL=(VRoffset/VRspg)*m3ToBBL;
}
// Check 'HVDspg' to avoid division by zero
if (HVDspg!=0){
    hvd2BBL=(HVDoffset/HVDspg)*m3ToBBL;
}
// Check if current VR rate less then the constant and calculates VR to HCU Isomax
if (vr2BBL<vr2Min){
    hd2vr2 = Math.min(vr2Min-vr2BBL,hvd2BBL)/m3ToBBL;
}

let hvd2Vol = 0;
// Check 'HVDspg' to avoid division by zero
if (HVDspg!=0){
    hvd2Vol = (HVDoffset/HVDspg);
}

// Check the hvd2Vol
if (hvd2Vol != Infinity){
    // Calculates reminder to the FCC
    const hd2FCM = hvd2Vol-hd2vr2;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter Hvy Dist 2.Parameters.M-HD2-M-FCM"] = hd2FCM;
    objOutput["Units.Splitter Hvy Dist 2.Parameters.M-HD2-M-VR2"] = hd2vr2;
}

// Logic: Calculation of 'Splitter Hy Nap 2'

// Calculate only if the input value for 'CDU-2 Jet/Hy NA to Jet' exists.
if (unitParameters(config.drlxUnit)["CDU-2 Jet/Hy NA to Jet"] != undefined) {
    // User input 'CDU-2 Jet/Hy NA to Jet' from DRLX unit
    const jetHN2toJet = unitParameters(config.drlxUnit)["CDU-2 Jet/Hy NA to Jet"].Value;
    // Calcualted stream mass and 'Specific Gravity'. Available 'AT#2-HY NA'.
    const jetHNoffset = objOutput["Streams.AT#2-HY NA.Mass"];
    const jetHNSPG = objOutput["Streams.AT#2-HY NA.Properties"]["Specific Gravity"]??0;
    let jetHNoffsetV = 0;
    // Check 'jetHNSPG' to avoid division by zero
    if (jetHNSPG!=0){
        jetHNoffsetV = jetHNoffset/jetHNSPG;
    }
    // Calcualtion only Heavy Naphtha 2 to Jet
    let hn2jet = Math.min(jetHN2toJet/m3ToBBL,jetHNoffsetV);
    let hn2dist = 0;
    // Save calcualtion results to the object 'objOutput'
    objOutput["Units.Splitter Hy Nap 2.Parameters.M-HN2-M-JTR"] = hn2jet;
    objOutput["Units.Splitter Hy Nap 2.Parameters.M-HN2-DIST"] = hn2dist;
}

// Results
// Set simulator variable data
// @param data An object with string keys representing variable paths.
// setData(data: { [key: string]: any }): void;
Simulator.setData(objOutput);
