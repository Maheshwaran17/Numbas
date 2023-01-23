/*
Copyright 2022 Newcastle University
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
/** @file Functions related to the download and interpretation of student results, and interaction with the results page, usually for outside-LTI contexts. */
Numbas.queueScript('results', ['jme'], function () {


    /** Functions related to the download and interpretation of student results, and interaction with the results page, usually for outside-LTI contexts.
     *
     * @namespace Numbas.results */
    var results = Numbas.results = /** @lends Numbas.results */ {
        // items should be accessible through Numbas.results.function, so either write them inside this as key:function pairs, or if necessary as:
        //var ensure_decimal = math.ensure_decimal = function(n) { ? We need them to be like this to ensure they're accessible from elsewhere, maybe.
        
        /** Ensures a string will not cause issues within a csv due to commas, quotes, etc. 
         * 
         * @param {string} cell 
         * @returns {string}
         */
        escape_csv_cell : function (cell) {
            cell = cell + '';
            if(cell.match(/[,"']/)) {
                cell = '"'+cell.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
            }
            return cell;
        },
        
        /** Escapes each cell of a list of strings such that each will not cause issues within a csv
         * 
         * @param {Array.<string>} cells 
         * @returns {string} 
         */
        make_csv_row : function (cells) {
            return cells.map(Numbas.results.escape_csv_cell).join(',');
        },

        /** Escapes each cell of a two-dimensional array of strings such that each will not cause issues within a csv
         * 
         * @param {Array.<Array.<string>>} rows 
         * @returns {string} 
         */
        make_csv : function (rows) {
            return rows.map(Numbas.results.make_csv_row).join('\n');
        },
        
        /** Creates a csv record of the student's scores and answers, and the maximal scores and correct answers.
         * 
         * @returns {string} csv of student's results.
         */
        create_results_csv :  function () {
            //todo: if questions are randomised at all, contain a line mapping to original ordering
            const randomised = Numbas.results.examIsRandomised();
            const questionMapping = Numbas.results.questionMapping();
            let exam = Numbas.exam;
            let partTypes = Numbas.storage.scorm.partTypeStorage;

            let header = [''];
            let expectedAnswers = [R('exam.csv.expected')];
            let studentAnswers = [R('exam.csv.student')];
            let trueOrder = [R('exam.csv.question key')];

            header.push(R('exam.csv.total score'));
            expectedAnswers.push(exam.mark);
            studentAnswers.push(exam.score);
            trueOrder.push('');

            exam.questionList.forEach((questionObject) => {
                let questionKey = questionObject.number; 
                let questionName = questionObject.name||(R('question')+ + " " + questionKey);
                let trueQuestionNumber = R('question') + questionMapping[questionKey]
                header.push(questionName);
                trueOrder.push(trueQuestionNumber);
                expectedAnswers.push(questionObject.marks);
                studentAnswers.push(questionObject.score);

                questionObject.parts.forEach((partObject) => {
                    let partKey = partObject.index;
                    let partName = partObject.name||(R('part') + " " + partKey);
                    let partType = partObject.type;
                    header.push(questionName + " "+ partName + " " + R('mark_plural'));
                    trueOrder.push(trueQuestionNumber + " " + partName + " " + R('mark_plural'));
                    expectedAnswers.push(partObject.marks);
                    studentAnswers.push(partObject.score);
                    if (partType!='gapfill'){
                        header.push(questionName + " " + partName + " " + R('answer'));
                        trueOrder.push(trueQuestionNumber + " " + partName + " " + R('answer'));
                        expectedAnswers.push(partTypes[partType].correct_answer(partObject)); 
                        studentAnswers.push(partTypes[partType].student_answer(partObject)); 
                    }

                    partObject.gaps.forEach((gapObject) => {
                        let gapKey = gapObject.index;  
                        let gapName = gapObject.name||(R('gap')+" "+gapKey);  
                        let gapType = gapObject.type;  
                        header.push(questionName + " " + partName + " " + gapName + " " + R('mark_plural'));
                        trueOrder.push(trueQuestionNumber + " " + partName + " " + gapName + " " + R('mark_plural'));
                        expectedAnswers.push(gapObject.marks);
                        studentAnswers.push(gapObject.score);
                        header.push(questionName + " " + partName + " " + gapName + " " + R('answer'));
                        trueOrder.push(trueQuestionNumber + " " + partName + " " + gapName + " " + R('answer'));
                        expectedAnswers.push(partTypes[gapType].correct_answer(gapObject)); 
                        studentAnswers.push(partTypes[gapType].student_answer(gapObject)); 
                    });
                    partObject.steps.forEach((stepObject) => {
                        let stepKey = stepObject.index;  
                        let stepName = stepObject.name||(R('step')+" "+stepKey);  
                        let stepType = stepObject.type;    
                        header.push(questionName + " " + partName + " " + stepName + " " + R('mark_plural'));
                        trueOrder.push(trueQuestionNumber + " " + partName + " " + stepName + " " + R('mark_plural'));
                        expectedAnswers.push(stepObject.marks);
                        studentAnswers.push(stepObject.score);
                        header.push(questionName + " " + partName + " " + stepName + " " + R('answer'));
                        trueOrder.push(trueQuestionNumber + " " + partName + " " + stepName + " " + R('answer'));
                        expectedAnswers.push(partTypes[stepType].correct_answer(stepObject)); 
                        studentAnswers.push(partTypes[stepType].student_answer(stepObject)); 
                    });
                });
            });
            let dataset = [header, expectedAnswers, studentAnswers];
            if (randomised) {
                dataset = [header, trueOrder, expectedAnswers, studentAnswers];
            }
            return Numbas.results.make_csv(dataset);
        },

        /**
         * 
         * @param {string} file 
         */
        create_and_download_file : function(file) {
            //pulled from https://stackoverflow.com/questions/8310657/how-to-create-a-dynamic-file-link-for-download-in-javascript
            let mime_type = 'text/plain';
            var blob = new Blob([file],{type: mime_type});
            var dlink = document.createElement('a');
            document.body.appendChild(dlink); //may be necessary for firefox/some browsers
            dlink.download="results.csv";
            dlink.href = window.URL.createObjectURL(blob);
            dlink.onclick = function(e) {
              var that = this;
              setTimeout(function() {
                window.URL.revokeObjectURL(that.href);
              }, 1500);
            };
          
            dlink.click()
            dlink.remove()
            
          },
        /**
         * Checks if any aspect of the exam is in a randomised order
         * 
         * @returns {boolean} whether the exam has any randomised components
         */
        examIsRandomised : function() {
            let exam = Numbas.exam;
            if (exam.settings.shuffleQuestionGroups) {
                return true;
            }
            for (let groupKey of Object.keys(exam.question_groups)) {
                let group = exam.question_groups[groupKey];
                if (group.settings.pickingStrategy!="all-ordered"){ //Future-proof: assume any new picking strategy might be randomising
                    return true;
                }
            }
            return false;

        },

        /**
         * Provides the mapping between the questions as shown to the student and the editor-order of those questions
         * 
         * @returns {Array.<int>} the mapping of the questions as shown to the student to the editor order.
         */
        questionMapping : function() {
            let exam = Numbas.exam;
            let groups = exam.question_groups; //note: this is the order of groups *as shown in the student's exam*. The default order map is groupOrder.
            let groupOrder = exam.questionGroupOrder;
            let questions = exam.questionList;
            const questionTotal = questions.length;
            let questionsPerGroup = groups.map(n => n.numQuestions);
            let questionMap = new Array(questionTotal);
            //let questionsPerGroup = [];
            //for (let groupKey of Object.keys(groups)) {
            //    questionsPerGroup.push(groups[groupKey].numQuestions)
            //}
            for (let groupKey of Object.keys(groups)) {
                let questionOffset = 0;
                let currentGroup = groups[groupKey];
                let questionOrder = currentGroup.questionSubset;
                let defaultGroupNumber = groupOrder[groupKey];
                //then for every group which has a lower default group number, add that to the group's base question number
                for (let comparedGroupKey of Object.keys(groups)) {
                    let comparedGroupDefaultNumber = groupOrder[comparedGroupKey];
                    if (comparedGroupDefaultNumber<defaultGroupNumber) {
                        questionOffset += questionsPerGroup[comparedGroupDefaultNumber];
                    }
                }
                for (let questionKey of Object.keys(currentGroup.questionList)){
                    let currentQuestion = currentGroup.questionList[questionKey];
                    questionMap[currentQuestion.displayNumber] = questionOffset + questionOrder[questionKey];
                }
            }
            return questionMap;
        }

    }
});