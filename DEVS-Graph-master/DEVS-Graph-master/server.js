const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const fse = require('fs-extra'); 
const path = require('path');
const unzipper = require('unzipper');
const extractPath = `compiled/extracted_${Date.now()}/`;
const app = express();
const port = 2345;
const uploadsFolder = multer({ dest: 'uploads/' });

const upload = multer({ dest: 'compiled/' });


function extractFile(uploadedFilePath, extractPath) {
   return new Promise((resolve, reject) => {
       fs.createReadStream(uploadedFilePath)
           .pipe(unzipper.Extract({ path: extractPath }))
           .on('close', () => {
               console.log('Extraction complete.');
               resolve();
           })
           .on('error', (err) => {
               console.log('Error during file extraction:', err.message);
               reject(err);
           });
   });
}
function cmakeBuild() {
    return new Promise((resolve) => { 
        const buildDir = path.resolve(extractPath);

        console.log(`Starting CMake build in directory: ${buildDir}`);

        // Run cmake to configure the project
        const cmakeCommand = `cmake ${buildDir}`;

        exec(cmakeCommand, { cwd: buildDir }, (cmakeError, cmakeStdout, cmakeStderr) => {
            if (cmakeError || cmakeStderr) {
                console.error('Error during CMake configuration:', cmakeError ? cmakeError.message : cmakeStderr);
                resolve(`Error during CMake configuration: ${cmakeError ? cmakeError.message : cmakeStderr}`); 
            } else {
                console.log('CMake configuration successful:', cmakeStdout);
            }

            const makeCommand = `make`;

            exec(makeCommand, { cwd: buildDir }, (makeError, makeStdout, makeStderr) => {
                if (makeError || makeStderr) {
                    console.error('Error during make build:', makeError ? makeError.message : makeStderr);
                    resolve(`Error during make build: ${makeError ? makeError.message : makeStderr}`);  
                } else {
                    console.log('Make build successful:', makeStdout);
                    resolve(makeStdout);
                }
            });
        });
    });
}

async function runExecutable(executableName, inputFilePath, numberParam){
    return new Promise((resolve, reject) => {

        const command = `${executableName} ./${inputFilePath} ${numberParam}`;
        const executablePath = `${extractPath}bin/`;

        // Execute the command in the directory where the executable is located
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error during executable run:', error.message);
                reject(`Error during executable run: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error('Executable run error:', stderr);
                reject(`Executable Run Error: ${stderr}`);
                return;
            }
            console.log('Executable run successful:', stdout);
            resolve(stdout);
        });
    });
};


async function compileAndRunCpp(extractPath) {
    return new Promise(async (resolve) => {
        const command = `g++ -w -std=c++17 -I./ -I. -I./cadmium -I${extractPath} ${extractPath}src/*.cpp`;
        exec(command, async (error, stdout, stderr) => {
            if (error || stderr) {
                console.log('Error during compilation:', error ? error.message : stderr);
                resolve(`Error during compilation: ${error ? error.message : stderr}`);
            } else {
                console.log('Compilation successful, output:', stdout);
                // If compilation is successful, proceed to copying files
            }
            
            try {
                await fse.copy('CMakeLists.txt', `${extractPath}CMakeLists.txt`);
                await fse.copy('cadmium_v2', `${extractPath}cadmium_v2`);
                // Resolve with success message indicating copying was also successful
                resolve('Compilation and file copying successful');
            } catch (copyError) {
                console.error('Error copying files:', copyError);
                // Resolve with error message from copying attempt
                resolve(`Error copying files: ${copyError}`);
            }
        });
    });
}

app.post('/compile', upload.fields([{ name: 'file1' }, { name: 'file2' }]), async (req, res) => {
    // Accessing files
    if (!req.files || !req.files['file1'] || !req.files['file2']) {
        console.log('Required files not uploaded.');
        return res.status(400).send('Required files not uploaded.');
    }

    const file1 = req.files['file1'][0]; // First file
    const file2 = req.files['file2'][0]; // Second file
   
    // Accessing other form inputs
    const numberParam = req.body.numberInput;

    // Extracted path for file1
    const uploadedFilePath = file1.path;

    // Correctly extract path for file2
    const inputFilePath = file2.path; // Use the correct property to get file2's path

   
    try {
      
        await extractFile(uploadedFilePath, extractPath);
      

        const cppOutput = await compileAndRunCpp(extractPath);
       
        const cmakeOutput = await cmakeBuild(extractPath);

        const runExecutablePath = `${extractPath}bin/main`;

        const runOutput = await runExecutable(runExecutablePath, inputFilePath, numberParam);
        console.log(`Output:\n${cppOutput}\nCMake Build Output:\n${cmakeOutput}\nRun Output:\n${runOutput}`);
        res.send(`Compilation and execution successful. Output:\n${runOutput}`);
    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).send('Error during compilation or execution.');
    }
});



app.listen(port, () => {
   console.log(`Server running at http://localhost:${port}`);
});



