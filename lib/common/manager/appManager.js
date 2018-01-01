"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let async = require("async");
const utils = require("../../util/utils");
const logger = require("pomelo-logger").getLogger("pomelo", __filename);
const transactionLogger = require("pomelo-logger").getLogger("transaction-log", __filename);
const transactionErrorLogger = require("pomelo-logger").getLogger("transaction-error-log", __filename);
function transaction(name, conditions, handlers, retry = 1) {
    if (typeof name !== "string") {
        logger.error("transaction name is error format, name: %s.", name);
        return;
    }
    if (typeof conditions !== "object" || typeof handlers !== "object") {
        logger.error("transaction conditions parameter is error format, conditions: %j, handlers: %j.", conditions, handlers);
        return;
    }
    let cmethods = [], dmethods = [], cnames = [], dnames = [];
    for (let key in conditions) {
        if (typeof key !== "string" || typeof conditions[key] !== "function") {
            logger.error("transaction conditions parameter is error format, condition name: %s, condition function: %j.", key, conditions[key]);
            return;
        }
        cnames.push(key);
        cmethods.push(conditions[key]);
    }
    let i = 0;
    // execute conditions
    async.forEachSeries(cmethods, function (method, cb) {
        method(cb);
        transactionLogger.info("[%s]:[%s] condition is executed.", name, cnames[i]);
        i++;
    }, function (err) {
        if (err) {
            process.nextTick(function () {
                transactionLogger.error("[%s]:[%s] condition is executed with err: %j.", name, cnames[--i], err.stack);
                let log = {
                    name: name,
                    method: cnames[i],
                    time: Date.now(),
                    type: "condition",
                    description: err.stack
                };
                transactionErrorLogger.error(JSON.stringify(log));
            });
            return;
        }
        else {
            // execute handlers
            process.nextTick(function () {
                for (let key in handlers) {
                    if (typeof key !== "string" ||
                        typeof handlers[key] !== "function") {
                        logger.error("transcation handlers parameter is error format, handler name: %s, handler function: %j.", key, handlers[key]);
                        return;
                    }
                    dnames.push(key);
                    dmethods.push(handlers[key]);
                }
                let flag = true;
                let times = retry;
                // do retry if failed util retry times
                async.whilst(function () {
                    return retry > 0 && flag;
                }, function (callback) {
                    let j = 0;
                    retry--;
                    async.forEachSeries(dmethods, function (method, cb) {
                        method(cb);
                        transactionLogger.info("[%s]:[%s] handler is executed.", name, dnames[j]);
                        j++;
                    }, function (err) {
                        if (err) {
                            process.nextTick(function () {
                                transactionLogger.error("[%s]:[%s]:[%s] handler is executed with err: %j.", name, dnames[--j], times - retry, err.stack);
                                let log = {
                                    name: name,
                                    method: dnames[j],
                                    retry: times - retry,
                                    time: Date.now(),
                                    type: "handler",
                                    description: err.stack
                                };
                                transactionErrorLogger.error(JSON.stringify(log));
                                utils.invokeCallback(callback);
                            });
                            return;
                        }
                        flag = false;
                        utils.invokeCallback(callback);
                        process.nextTick(function () {
                            transactionLogger.info("[%s] all conditions and handlers are executed successfully.", name);
                        });
                    });
                }, function (err) {
                    if (err) {
                        logger.error("transaction process is executed with error: %j", err);
                    }
                    // callback will not pass error
                });
            });
        }
    });
}
exports.transaction = transaction;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsMENBQTJDO0FBRTNDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQ3hFLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FDMUQsaUJBQWlCLEVBQ2pCLFVBQVUsQ0FDWCxDQUFDO0FBQ0YsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsU0FBUyxDQUMvRCx1QkFBdUIsRUFDdkIsVUFBVSxDQUNYLENBQUM7QUFFRixxQkFDRSxJQUFZLEVBQ1osVUFBdUIsRUFDdkIsUUFBcUIsRUFDckIsUUFBZ0IsQ0FBQztJQUVqQixFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDO0lBQ1QsQ0FBQztJQUNELEVBQUUsQ0FBQyxDQUFDLE9BQU8sVUFBVSxLQUFLLFFBQVEsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxLQUFLLENBQ1YsaUZBQWlGLEVBQ2pGLFVBQVUsRUFDVixRQUFRLENBQ1QsQ0FBQztRQUNGLE1BQU0sQ0FBQztJQUNULENBQUM7SUFFRCxJQUFJLFFBQVEsR0FBRyxFQUFFLEVBQ2YsUUFBUSxHQUFlLEVBQUUsRUFDekIsTUFBTSxHQUFhLEVBQUUsRUFDckIsTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUN4QixHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcs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LENBQUMsRUFDRCxVQUFTLEdBQVE7b0JBQ2YsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDUixNQUFNLENBQUMsS0FBSyxDQUNWLGdEQUFnRCxFQUNoRCxHQUFHLENBQ0osQ0FBQztvQkFDSixDQUFDO29CQUNELCtCQUErQjtnQkFDakMsQ0FBQyxDQUNGLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDLENBQ0YsQ0FBQztBQUNKLENBQUM7QUE3SkQsa0NBNkpDIiwic291cmNlc0NvbnRlbnQiOlsibGV0IGFzeW5jID0gcmVxdWlyZShcImFzeW5jXCIpO1xuaW1wb3J0IHV0aWxzID0gcmVxdWlyZShcIi4uLy4uL3V0aWwvdXRpbHNcIik7XG5pbXBvcnQgeyBGdW5jdGlvbk1hcCB9IGZyb20gXCIuLi8uLi9pbmRleFwiO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZShcInBvbWVsby1sb2dnZXJcIikuZ2V0TG9nZ2VyKFwicG9tZWxvXCIsIF9fZmlsZW5hbWUpO1xuY29uc3QgdHJhbnNhY3Rpb25Mb2dnZXIgPSByZXF1aXJlKFwicG9tZWxvLWxvZ2dlclwiKS5nZXRMb2dnZXIoXG4gIFwidHJhbnNhY3Rpb24tbG9nXCIsXG4gIF9fZmlsZW5hbWVcbik7XG5jb25zdCB0cmFuc2FjdGlvbkVycm9yTG9nZ2VyID0gcmVxdWlyZShcInBvbWVsby1sb2dnZXJcIikuZ2V0TG9nZ2VyKFxuICBcInRyYW5zYWN0aW9uLWVycm9yLWxvZ1wiLFxuICBfX2ZpbGVuYW1lXG4pO1xuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNhY3Rpb24oXG4gIG5hbWU6IHN0cmluZyxcbiAgY29uZGl0aW9uczogRnVuY3Rpb25NYXAsXG4gIGhhbmRsZXJzOiBGdW5jdGlvbk1hcCxcbiAgcmV0cnk6IG51bWJlciA9IDFcbikge1xuICBpZiAodHlwZW9mIG5hbWUgIT09IFwic3RyaW5nXCIpIHtcbiAgICBsb2dnZXIuZXJyb3IoXCJ0cmFuc2FjdGlvbiBuYW1lIGlzIGVycm9yIGZvcm1hdCwgbmFtZTogJXMuXCIsIG5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAodHlwZW9mIGNvbmRpdGlvbnMgIT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGhhbmRsZXJzICE9PSBcIm9iamVjdFwiKSB7XG4gICAgbG9nZ2VyLmVycm9yKFxuICAgICAgXCJ0cmFuc2FjdGlvbiBjb25kaXRpb25zIHBhcmFtZXRlciBpcyBlcnJvciBmb3JtYXQsIGNvbmRpdGlvbnM6ICVqLCBoYW5kbGVyczogJWouXCIsXG4gICAgICBjb25kaXRpb25zLFxuICAgICAgaGFuZGxlcnNcbiAgICApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBjbWV0aG9kcyA9IFtdLFxuICAgIGRtZXRob2RzOiBGdW5jdGlvbltdID0gW10sXG4gICAgY25hbWVzOiBzdHJpbmdbXSA9IFtdLFxuICAgIGRuYW1lczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChsZXQga2V5IGluIGNvbmRpdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGtleSAhPT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgY29uZGl0aW9uc1trZXldICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgXCJ0cmFuc2FjdGlvbiBjb25kaXRpb25zIHBhcmFtZXRlciBpcyBlcnJvciBmb3JtYXQsIGNvbmRpdGlvbiBuYW1lOiAlcywgY29uZGl0aW9uIGZ1bmN0aW9uOiAlai5cIixcbiAgICAgICAga2V5LFxuICAgICAgICBjb25kaXRpb25zW2tleV1cbiAgICAgICk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNuYW1lcy5wdXNoKGtleSk7XG4gICAgY21ldGhvZHMucHVzaChjb25kaXRpb25zW2tleV0pO1xuICB9XG5cbiAgbGV0IGkgPSAwO1xuICAvLyBleGVjdXRlIGNvbmRpdGlvbnNcbiAgYXN5bmMuZm9yRWFjaFNlcmllcyhcbiAgICBjbWV0aG9kcyxcbiAgICBmdW5jdGlvbihtZXRob2Q6IEZ1bmN0aW9uLCBjYjogRnVuY3Rpb24pIHtcbiAgICAgIG1ldGhvZChjYik7XG4gICAgICB0cmFuc2FjdGlvbkxvZ2dlci5pbmZvKFxuICAgICAgICBcIlslc106WyVzXSBjb25kaXRpb24gaXMgZXhlY3V0ZWQuXCIsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGNuYW1lc1tpXVxuICAgICAgKTtcbiAgICAgIGkrKztcbiAgICB9LFxuICAgIGZ1bmN0aW9uKGVycjogYW55KSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdHJhbnNhY3Rpb25Mb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICBcIlslc106WyVzXSBjb25kaXRpb24gaXMgZXhlY3V0ZWQgd2l0aCBlcnI6ICVqLlwiLFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIGNuYW1lc1stLWldLFxuICAgICAgICAgICAgZXJyLnN0YWNrXG4gICAgICAgICAgKTtcbiAgICAgICAgICBsZXQgbG9nID0ge1xuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIG1ldGhvZDogY25hbWVzW2ldLFxuICAgICAgICAgICAgdGltZTogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgIHR5cGU6IFwiY29uZGl0aW9uXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZXJyLnN0YWNrXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0cmFuc2FjdGlvbkVycm9yTG9nZ2VyLmVycm9yKEpTT04uc3RyaW5naWZ5KGxvZykpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXhlY3V0ZSBoYW5kbGVyc1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGZvciAobGV0IGtleSBpbiBoYW5kbGVycykge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICB0eXBlb2Yga2V5ICE9PSBcInN0cmluZ1wiIHx8XG4gICAgICAgICAgICAgIHR5cGVvZiBoYW5kbGVyc1trZXldICE9PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgXCJ0cmFuc2NhdGlvbiBoYW5kbGVycyBwYXJhbWV0ZXIgaXMgZXJyb3IgZm9ybWF0LCBoYW5kbGVyIG5hbWU6ICVzLCBoYW5kbGVyIGZ1bmN0aW9uOiAlai5cIixcbiAgICAgICAgICAgICAgICBrZXksXG4gICAgICAgICAgICAgICAgaGFuZGxlcnNba2V5XVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkbmFtZXMucHVzaChrZXkpO1xuICAgICAgICAgICAgZG1ldGhvZHMucHVzaChoYW5kbGVyc1trZXldKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgZmxhZyA9IHRydWU7XG4gICAgICAgICAgbGV0IHRpbWVzID0gcmV0cnk7XG5cbiAgICAgICAgICAvLyBkbyByZXRyeSBpZiBmYWlsZWQgdXRpbCByZXRyeSB0aW1lc1xuICAgICAgICAgIGFzeW5jLndoaWxzdChcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gcmV0cnkgPiAwICYmIGZsYWc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oY2FsbGJhY2s6IEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgIGxldCBqID0gMDtcbiAgICAgICAgICAgICAgcmV0cnktLTtcbiAgICAgICAgICAgICAgYXN5bmMuZm9yRWFjaFNlcmllcyhcbiAgICAgICAgICAgICAgICBkbWV0aG9kcyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihtZXRob2Q6IEZ1bmN0aW9uLCBjYjogRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgIG1ldGhvZChjYik7XG4gICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbkxvZ2dlci5pbmZvKFxuICAgICAgICAgICAgICAgICAgICBcIlslc106WyVzXSBoYW5kbGVyIGlzIGV4ZWN1dGVkLlwiLFxuICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICBkbmFtZXNbal1cbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICBqKys7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uTG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJbJXNdOlslc106WyVzXSBoYW5kbGVyIGlzIGV4ZWN1dGVkIHdpdGggZXJyOiAlai5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkbmFtZXNbLS1qXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzIC0gcmV0cnksXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnIuc3RhY2tcbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgIGxldCBsb2cgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBkbmFtZXNbal0sXG4gICAgICAgICAgICAgICAgICAgICAgICByZXRyeTogdGltZXMgLSByZXRyeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU6IERhdGUubm93KCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImhhbmRsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBlcnIuc3RhY2tcbiAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uRXJyb3JMb2dnZXIuZXJyb3IoSlNPTi5zdHJpbmdpZnkobG9nKSk7XG4gICAgICAgICAgICAgICAgICAgICAgdXRpbHMuaW52b2tlQ2FsbGJhY2soY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZmxhZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgdXRpbHMuaW52b2tlQ2FsbGJhY2soY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb25Mb2dnZXIuaW5mbyhcbiAgICAgICAgICAgICAgICAgICAgICBcIlslc10gYWxsIGNvbmRpdGlvbnMgYW5kIGhhbmRsZXJzIGFyZSBleGVjdXRlZCBzdWNjZXNzZnVsbHkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgbmFtZVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKGVycjogYW55KSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgICBcInRyYW5zYWN0aW9uIHByb2Nlc3MgaXMgZXhlY3V0ZWQgd2l0aCBlcnJvcjogJWpcIixcbiAgICAgICAgICAgICAgICAgIGVyclxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gY2FsbGJhY2sgd2lsbCBub3QgcGFzcyBlcnJvclxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgKTtcbn1cbiJdfQ==