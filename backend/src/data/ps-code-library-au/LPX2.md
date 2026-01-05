
# Submitter
Wu, WeiWei
# Email
weiwei.wu@aspentech.com
# Version
14
# Technical Description
This logical unit calculates splitter 'Splitter HCU Deprop' yields based on the feed stream 'M-FID-M-IDF' composition.
The composition is the ratio 0-1. The total should be 1. 
The logic reads the composition per each yield and muliplied the ratio by 100%. Splitter is accepting the values in the percentage 0-100%.
The calculation result is updating the splitter parameters ('IDE-C1D', 'IDE-C2D', 'IDE-C3D', 'IDE-I4D', 'IDE-N4D', 'IDE-I5D', 'IDE-N5D').

# Business Description
This is a unit that controls the calculation of the separation of the flow into short light fractions based on the initial composition of the input flow to the unit.

# Code
```js
// Define Inputs
// Definition of the inputs: composition
// Get a value from the cache if it already exists, or create it if it doesn't exist
// @param key The unique key associated with the data to retrieve from the cache
// @param create A function to create the data if it does not yet exist
// getOrSet(key, create): any;
const config = UnitCache.getOrSet("CONFIG", () => {
    
// DataRequest class for efficiently requesting data multiple times. Should be used if the same set of variable requests will be made at multiple simulation periods.
// @param key The request key, should be unique within the custom unit script
// @param build The function to generate the list of variables to retreive in the request
// constructor(key: string, build: () => string[]);
// Execute the data request.
// execute(): { [key: string]: any };

    const request = new DataRequest("Inputs", () => {
        const inputArray = [];
        
        // 'Splitter HCU Deprop' feed rate and feed composition
        inputArray.push(`Streams.M-FID-M-IDF.Composition`);
        
        return inputArray;
    });
    return {
        request: request
    }
});

// Simulation input data defined in the object 'config' is in the object 'dataIn'.
const dataIn = config.request.execute();

// Object for the results.
const objOutput = {};

// Logic: 'Splitter HCU Deprop' Splitter Yields Calculation

// Reading feed composition values to the constants
const compositionFeedSplitterHCUDeprop = dataIn[`Streams.M-FID-M-IDF.Composition`];
const P_C1 = 100*(compositionFeedSplitterHCUDeprop["C1 TO DEPROP"]??0);
const P_C2 = 100*(compositionFeedSplitterHCUDeprop["C2 TO DEPROP"]??0);
const P_C3 = 100*(compositionFeedSplitterHCUDeprop["C3 TO DEPROP"]??0);
const P_I4 = 100*(compositionFeedSplitterHCUDeprop["iC4 TO DEPROP"]??0);
const P_C4 = 100*(compositionFeedSplitterHCUDeprop["nC4 TO DEPROP"]??0);
const P_I5 = 100*(compositionFeedSplitterHCUDeprop["iC5 TO DEPROP"]??0);
const P_C5 = 100*(compositionFeedSplitterHCUDeprop["nC5 TO DEPROP"]??0);

// Save calcualtion results to the object 'objOutput'
objOutput["Units.Splitter HCU Deprop.Parameters.IDE-C1D"] = P_C1;
objOutput["Units.Splitter HCU Deprop.Parameters.IDE-C2D"] = P_C2;
objOutput["Units.Splitter HCU Deprop.Parameters.IDE-C3D"] = P_C3;
objOutput["Units.Splitter HCU Deprop.Parameters.IDE-I4D"] = P_I4;
objOutput["Units.Splitter HCU Deprop.Parameters.IDE-N4D"] = P_C4;
objOutput["Units.Splitter HCU Deprop.Parameters.IDE-I5D"] = P_I5;
objOutput["Units.Splitter HCU Deprop.Parameters.IDE-N5D"] = P_C5;

// Results
// Set simulator variable data
// @param data An object with string keys representing variable paths.
// setData(data: { [key: string]: any }): void;
Simulator.setData(objOutput);
```