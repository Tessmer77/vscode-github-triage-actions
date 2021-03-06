"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const fs_1 = require("fs");
const path_1 = require("path");
const github_1 = require("@actions/github");
const octokit_1 = require("../../../api/octokit");
const utils_1 = require("../../../utils/utils");
const token = utils_1.getRequiredInput('token');
const allowLabels = (utils_1.getInput('allowLabels') || '').split('|');
const debug = !!utils_1.getInput('__debug');
console.log({ debug });
const main = async () => {
    var _a, _b;
    console.log('hello');
    const github = new octokit_1.OctoKit(token, github_1.context.repo);
    const config = await github.readConfig(utils_1.getRequiredInput('config-path'));
    const labelings = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, '../issue_labels.json'), { encoding: 'utf8' }));
    console.log('labelings:', labelings);
    for (const labeling of labelings) {
        const issue = new octokit_1.OctoKitIssue(token, github_1.context.repo, { number: labeling.number });
        const issueData = await issue.getIssue();
        if (!debug &&
            (issueData.assignee ||
                issueData.numComments ||
                issueData.labels.some((label) => !allowLabels.includes(label)))) {
            console.log('skipping');
            continue;
        }
        console.log('not skipping', {
            assignee: labeling.assignee,
            labels: labeling.labels,
            number: labeling.number,
        });
        const assignee = labeling.assignee;
        if (assignee) {
            console.log('has assignee');
            if (debug) {
                if (!(await github.repoHasLabel(assignee))) {
                    console.log(`creating assignee label`);
                    await github.createLabel(assignee, 'ffa5a1', '');
                }
                await issue.addLabel(assignee);
            }
            const assigneeConfig = (_a = config.assignees) === null || _a === void 0 ? void 0 : _a[assignee];
            console.log({ assigneeConfig });
            await Promise.all([
                (assigneeConfig === null || assigneeConfig === void 0 ? void 0 : assigneeConfig.assign) ? issue.addAssignee(assignee) : Promise.resolve(),
                (assigneeConfig === null || assigneeConfig === void 0 ? void 0 : assigneeConfig.comment) ? issue.postComment(assigneeConfig.comment) : Promise.resolve(),
            ]);
        }
        const label = labeling.labels.length > 0 ? labeling.labels[0] : undefined;
        if (label) {
            console.log(`adding label ${label} to issue ${issueData.number}`);
            if (debug) {
                if (!(await github.repoHasLabel(label))) {
                    console.log(`creating label`);
                    await github.createLabel(label, 'f1d9ff', '');
                }
            }
            const labelConfig = (_b = config.labels) === null || _b === void 0 ? void 0 : _b[label];
            await Promise.all([
                (labelConfig === null || labelConfig === void 0 ? void 0 : labelConfig.applyLabel) || debug ? issue.addLabel(label) : Promise.resolve,
                (labelConfig === null || labelConfig === void 0 ? void 0 : labelConfig.comment) ? issue.postComment(labelConfig.comment) : Promise.resolve(),
                ...((labelConfig === null || labelConfig === void 0 ? void 0 : labelConfig.assign) ? labelConfig.assign.map((assignee) => issue.addAssignee(assignee))
                    : []),
            ]);
        }
    }
};
main()
    .then(() => utils_1.logRateLimit(token))
    .catch(async (error) => {
    core.setFailed(error.message);
    await utils_1.logErrorToIssue(error, true, token);
});
//# sourceMappingURL=index.js.map