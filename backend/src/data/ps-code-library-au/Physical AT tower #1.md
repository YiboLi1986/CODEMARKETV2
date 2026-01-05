
# Submitter
Wu, WeiWei
# Email
weiwei.wu@aspentech.com
# Version
16
# Technical Description
This logical unit calculates offsets for the 'Physical AT tower #1' unit yields.
Read the stream Rates, Services, Properties and Compositions from the unit 'Physical AT tower #1'.
Applies coefficients to the stream rates.
Copies Services, Properties and Composition.
# Business Description
The refinery models are usually built on the basis of sub-models of the AUP or other planning systems. Such sub-models usually calculate values ​​on average for a month. In the AUS model, more accurate values ​​are needed, taking into account the minimum periods and fluctuations on the scheduling horizon. For this, users prefer to adjust the values ​​through coefficients for a given period based on the latest values/yields ​​from the refinery or based on their experience and situation. This unit is able to read the coefficient input from the user and apply them to the outputs of the unit, in this case to the yields of the atmospheric tower unit.
# Code
```js
// Define Inputs
// Definition of the inputs: units, parameters (units and offsetUnitParams), streams (offSetUnitFeeds and offSetUnitProds), properties, default services (materialservices), composition
// Get a value from the cache if it already exists, or create it if it doesn't exist
// @param key The unique key associated with the data to retrieve from the cache
// @param create A function to create the data if it does not yet exist
// getOrSet(key, create): any;
const config = UnitCache.getOrSet("CONFIG", () => {
    const poolconfig = {
        offsetUnit: "AT Tower#1 Offset",
        mainUnit: "Physical AT tower #1",
        rps_capsUnit: "RPS_CAPS",
        rOffUnit: "ROFF",
        fccUnit: "FCCU",
        stabFeedUnit: "Stab Feed Mixer",
        constantsUnit: "Constants",
        at1xUnit: "AT1X",
        offSetUnitFeeds: [
            "AT#1-LPG Pre-Offset",
            "DIT1",
            "DW1",
            "DIB1",
            "AT#1-LSRN Pre-Offset", 
            "AT#1-SRN Pre-Offset", 
            "AT#1-STOVE Pre-Offset", 
            "AT#1-DIESEL Pre-Offset", 
            "AT#1-MGO Pre-Offset",
            "AT#1-LVD Pre-Offset",
            "AT#1-HVD Pre-Offset",
            "AT#1-VAC RESID Pre-Offset"],
        offSetUnitProds: [
            "AT#1-LPG",
            "DT1A",
            "DW1A",
            "DB1A",
            "AT#1-LSRN", 
            "AT#1-SRN", 
            "AT#1-STOVE", 
            "AT#1-DIESEL", 
            "AT#1-MGO",             
            "AT#1-LVD",
            "AT#1-HVD",
            "AT#1-VAC RESID"],
        offsetUnitParams: [
            "Offset LPG (wgt% of feed)",
            "Offset LSRN (wgt% of feed)",
            "Offset LSRN (wgt% of feed)",
            "Offset LSRN (wgt% of feed)", 
            "Offset LSRN (wgt% of feed)", 
            "Offset SRN (wgt% of feed)", 
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
            "#1 LSRN", 
            "SRN", 
            "#1 STOVE", 
            "DIESEL", 
            "MGO", 
            "LVD", 
            "HVD",
            "VAC RESID"]        
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
        inputArray.push(`Units.${poolconfig.offsetUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.rps_capsUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.constantsUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.fccUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.at1xUnit}.Parameters`);
        inputArray.push(`Units.${poolconfig.stabFeedUnit}.Parameters`);
        // rates (Mass and Volume), Service, Properties, Composition
        for (let i = 0; i < poolconfig.offSetUnitFeeds.length; i++) {
            const stream = poolconfig.offSetUnitFeeds[i];
            inputArray.push(`Streams.${stream}.Mass`);
            inputArray.push(`Streams.${stream}.Volume`);
            inputArray.push(`Streams.${stream}.Service`);
            inputArray.push(`Streams.${stream}.Properties`);
            inputArray.push(`Streams.${stream}.Composition`);
        }
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
// Input Properies object.
const getStreamProperties = (stream) => dataIn[`Streams.${stream}.Properties`];

// Calculation of the Total Mass and Total Volume.
let mainUnitFeedRate = 0;
let mainUnitFeedRateVOL = 0;
for (let i = 0; i < config.offSetUnitFeeds.length; i++) {
    mainUnitFeedRate += getStreamMass(config.offSetUnitFeeds[i])
    mainUnitFeedRateVOL += getStreamVolume(config.offSetUnitFeeds[i])
}

// Coefficients for the conversion
const BBLTOM3 = unitParameters(config.constantsUnit)["Barrel to m3 factor"].Value
const M3TOBBL = unitParameters(config.constantsUnit)["m3 to barrel factor"].Value

// Save calcualtion results ('CDU1 Total' BBL/Day) to the object 'objOutput'
objOutput[`Streams.CDU1 Total.Volume`] = mainUnitFeedRateVOL*M3TOBBL;

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
    Log.warning(`Offsets Sum for '${config.mainUnit}' is not 0, but '${totalOffsets}' and will cause mass imbalance across Unit'`);
}

// Logic: Calculation of AT Tower#1 Bottoms (AT#1-LVD, AT#1-HVD, AT#1-VAC RESID) to FCC unit

// Original stream rates (Mass) (AT#1-LVD, AT#1-HVD, AT#1-VAC RESID)
const lvdMass = objOutput[`Streams.AT#1-LVD.Mass`];
const hvdMass = objOutput[`Streams.AT#1-HVD.Mass`];
const vrMass = objOutput[`Streams.AT#1-VAC RESID.Mass`]

// Original streams (Specific Gravity) (AT#1-LVD, AT#1-HVD, AT#1-VAC RESID)
const lvdSPG = dataIn[`Streams.AT#1-LVD Pre-Offset.Properties`][`Specific Gravity`];
const hvdSPG = dataIn[`Streams.AT#1-HVD Pre-Offset.Properties`][`Specific Gravity`];
const vrSPG = dataIn[`Streams.AT#1-VAC RESID Pre-Offset.Properties`][`Specific Gravity`]

// Original stream rates (Volume) (AT#1-LVD, AT#1-HVD, AT#1-VAC RESID)
const lvdvol = dataIn[`Streams.AT#1-LVD Pre-Offset.Volume`];
const hvdvol = dataIn[`Streams.AT#1-HVD Pre-Offset.Volume`];
const vrvol = dataIn[`Streams.AT#1-VAC RESID Pre-Offset.Volume`]

// Total original stream rates (Mass and Volume) (AT#1-LVD, AT#1-HVD, AT#1-VAC RESID)
const prodlvdhvdvrMass = (lvdMass+hvdMass+vrMass)??0;
const prodlvdhvdvrVOL = (lvdvol+hvdvol+vrvol)??0;

// Input parameter value 'Atm bottoms to FCCU (bpd)'
const atmBtmToFCCbpd = unitParameters(config.at1xUnit)["Atm bottoms to FCCU (bpd)"]?.Value;

let totalToFCCMass = 0;
// Calculate only if the input value for 'Atm bottoms to FCCU (bpd)' exists.
if (atmBtmToFCCbpd != undefined){
    let prodlvdhvdvrDen = 0;
    // Calculation total (Specific Gravity) (AT#1-LVD, AT#1-HVD, AT#1-VAC RESID), if total volume rate > 0.
    if (prodlvdhvdvrVOL!=0){
        prodlvdhvdvrDen = prodlvdhvdvrMass/prodlvdhvdvrVOL;
    }
    // Calculation total to M3/Day
    const atmBtmToFCCMass = atmBtmToFCCbpd*prodlvdhvdvrDen*BBLTOM3;
    // Total user input should be < or = available total
    const atmBtmToFCC = Math.min(atmBtmToFCCMass,prodlvdhvdvrMass);
    
    let lvdToFCC = 0;
    let hvdToFCC = 0;
    let vrToFCC = 0;
    // Check 'prodlvdhvdvrMass' to avoid division by zero
    if (prodlvdhvdvrMass!=0){
        // Check 'lvdSPG' to avoid division by zero
        if (lvdSPG!=0){
            lvdToFCC = (lvdMass/prodlvdhvdvrMass)*atmBtmToFCC/lvdSPG;
        }
        // Check 'hvdSPG' to avoid division by zero
        if (hvdSPG!=0){
            hvdToFCC = (hvdMass/prodlvdhvdvrMass)*atmBtmToFCC/hvdSPG;
        }
        // Check 'vrSPG' to avoid division by zero
        if (vrSPG!=0){
            vrToFCC = (vrMass/prodlvdhvdvrMass)*atmBtmToFCC/vrSPG;
        }
        // Calculation total FCC Mass Rate
        totalToFCCMass = (lvdMass/prodlvdhvdvrMass)*atmBtmToFCC + (hvdMass/prodlvdhvdvrMass)*atmBtmToFCC + (vrMass/prodlvdhvdvrMass)*atmBtmToFCC;
    }
    // Save calcualtion results (rates to FCC) to the object 'objOutput'.
    objOutput["Units.Splitter LV1.Parameters.M-LV1O-M-ABFC"] = lvdToFCC;
    objOutput["Units.Splitter Hvy Dist 1.Parameters.M-HD1O-M-ABFC"] = hvdToFCC;
    objOutput["Units.Splitter Vac Resid 1.Parameters.M-VBRO-M-ABFC"] = vrToFCC;
}

// Logic: Vacuum recycle logic

// Input parameters
const vacRecToFCCbpd = unitParameters(config.at1xUnit)["Vac recycle to FCCU (bpd)"]?.Value??0;
const feedRateFCCbpd = unitParameters(config.fccUnit)["Intake"]?.Value;
// Fixed Ratio
const hv1Ratio = unitParameters(config.rps_capsUnit)["VRC HV Ratio"]?.Value; 
const vr1Ratio = unitParameters(config.rps_capsUnit)["VRC VR Ratio"]?.Value;

// Total available without rate to FCC
const available = prodlvdhvdvrMass-totalToFCCMass;
let hvdVolAfter = 0;
let vbrVRF = 0;
let hd1VRF = 0;
// Calculate only if the input value for FCC 'Intake' > 0.
if (feedRateFCCbpd > 0) {
    const userAmountToVacRec = vacRecToFCCbpd*BBLTOM3;
    // Check 'hvdSPG' to avoid division by zero
    if (hvdSPG!=0 && prodlvdhvdvrMass!=0){
        // Calculate hvd proportionally lvd/hvd/vr
        hvdVolAfter = available*(hvdMass/prodlvdhvdvrMass)/hvdSPG;
    } 
    // Check 'vrSPG' to avoid division by zero
    let vrVolAfter = 0;
    if (vrSPG!=0 && prodlvdhvdvrMass!=0){
        // Calculate vr proportionally lvd/hvd/vr
        vrVolAfter = available*(vrMass/prodlvdhvdvrMass)/vrSPG;
    }
    // Input parameters calculation with fixed ratio
    const hvdNeeded = hv1Ratio*userAmountToVacRec;
    const vrNeeded = vr1Ratio*userAmountToVacRec;
    let maxPossibVacRec = 0;
    // Calculation with hv1
    if (hvdVolAfter<hvdNeeded && hv1Ratio!=0){
        maxPossibVacRec = hvdVolAfter/hv1Ratio;
    }
    // Calculation with vr1
    else{
        if (vr1Ratio!=0){
            maxPossibVacRec = vrVolAfter/vr1Ratio;
        }
    }
    // Vacuum Residue to FCC
    vbrVRF = maxPossibVacRec*vr1Ratio;
    // Heavy Distillate to FCC
    hd1VRF = maxPossibVacRec*hv1Ratio;
    // Checking input value < or = available
    if (hvdVolAfter>=hvdNeeded && vrVolAfter>=vrNeeded){
        vbrVRF=vrNeeded;
        hd1VRF=hvdNeeded;
    }
    // Save calcualtion results (rates Heavy Distillate and Vacuum Residue to FCC) to the object 'objOutput'.
    objOutput["Units.Splitter2 Hvy Dist 1.Parameters.M-HD1-M-VRF"] = hd1VRF;
    objOutput["Units.Splitter2 Vac Resid1.Parameters.M-VBR-M-VRF"] = vbrVRF;
}

// Logic: Heavy Vacuum Distillate to Vacuum bottoms

// Input parameters
// CDU-1 VacBottoms (constant)
const stabMax = unitParameters(config.rps_capsUnit)["CDU-1 VacBottoms"]?.Minimum;
// Remainder of Vacuum Residue
const vacBottomsVOL = vrMass/vrSPG - vbrVRF;
// Minumum Vacuum bottoms M3
const minFlow = stabMax*BBLTOM3;
// Available Heavy Vacuum Distillate
const availHVD = hvdVolAfter-hd1VRF;
// Calculation Heavy Vacuum Distillate to Vacuum bottoms
const hvdToVacBtms = Math.min(minFlow??0-vacBottomsVOL??0,availHVD);

// Check if Vacuum bottoms > Minimum, then set  Vacuum Residue = 0 to Vacuum bottoms
if (vacBottomsVOL>minFlow){
    // Save calcualtion results (0) to the object 'objOutput'.
    objOutput["Units.Splitter2 Hvy Dist 1.Parameters.M-HD1-M-VR1"] = 0;
}
// Heavy Vacuum Distillate to Vacuum bottoms calcualted
else{
    // Save calcualtion results to the object 'objOutput'.
    objOutput["Units.Splitter2 Hvy Dist 1.Parameters.M-HD1-M-VR1"] = hvdToVacBtms;
}

// Results
// Set simulator variable data
// @param data An object with string keys representing variable paths.
// setData(data: { [key: string]: any }): void;
Simulator.setData(objOutput);
```