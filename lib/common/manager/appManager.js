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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsMENBQTJDO0FBRTNDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQ3hFLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FDMUQsaUJBQWlCLEVBQ2pCLFVBQVUsQ0FDWCxDQUFDO0FBQ0YsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsU0FBUyxDQUMvRCx1QkFBdUIsRUFDdkIsVUFBVSxDQUNYLENBQUM7QUFFRixxQkFDRSxJQUFZLEVBQ1osVUFBdUIsRUFDdkIsUUFBcUIsRUFDckIsUUFBZ0IsQ0FBQztJQUVqQixFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDO0lBQ1QsQ0FBQztJQUNELEVBQUUsQ0FBQyxDQUFDLE9BQU8sVUFBVSxLQUFLLFFBQVEsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxLQUFLLENBQ1YsaUZBQWlGLEVBQ2pGLFVBQVUsRUFDVixRQUFRLENBQ1QsQ0FBQztRQUNGLE1BQU0sQ0FBQztJQUNULENBQUM7SUFFRCxJQUFJLFFBQVEsR0FBRyxFQUFFLEVBQ2YsUUFBUSxHQUFlLEVBQUUsRUFDekIsTUFBTSxHQUFhLEVBQUUsRUFDckIsTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUN4QixHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcs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LENBQUMsRUFDRCxVQUFTLEdBQVE7b0JBQ2YsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDUixNQUFNLENBQUMsS0FBSyxDQUNWLGdEQUFnRCxFQUNoRCxHQUFHLENBQ0osQ0FBQztvQkFDSixDQUFDO29CQUNELCtCQUErQjtnQkFDakMsQ0FBQyxDQUNGLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDLENBQ0YsQ0FBQztBQUNKLENBQUM7QUE3SkQsa0NBNkpDIiwic291cmNlc0NvbnRlbnQiOlsibGV0IGFzeW5jID0gcmVxdWlyZShcImFzeW5jXCIpO1xyXG5pbXBvcnQgdXRpbHMgPSByZXF1aXJlKFwiLi4vLi4vdXRpbC91dGlsc1wiKTtcclxuaW1wb3J0IHsgRnVuY3Rpb25NYXAgfSBmcm9tIFwiLi4vLi4vaW5kZXhcIjtcclxuY29uc3QgbG9nZ2VyID0gcmVxdWlyZShcInBvbWVsby1sb2dnZXJcIikuZ2V0TG9nZ2VyKFwicG9tZWxvXCIsIF9fZmlsZW5hbWUpO1xyXG5jb25zdCB0cmFuc2FjdGlvbkxvZ2dlciA9IHJlcXVpcmUoXCJwb21lbG8tbG9nZ2VyXCIpLmdldExvZ2dlcihcclxuICBcInRyYW5zYWN0aW9uLWxvZ1wiLFxyXG4gIF9fZmlsZW5hbWVcclxuKTtcclxuY29uc3QgdHJhbnNhY3Rpb25FcnJvckxvZ2dlciA9IHJlcXVpcmUoXCJwb21lbG8tbG9nZ2VyXCIpLmdldExvZ2dlcihcclxuICBcInRyYW5zYWN0aW9uLWVycm9yLWxvZ1wiLFxyXG4gIF9fZmlsZW5hbWVcclxuKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2FjdGlvbihcclxuICBuYW1lOiBzdHJpbmcsXHJcbiAgY29uZGl0aW9uczogRnVuY3Rpb25NYXAsXHJcbiAgaGFuZGxlcnM6IEZ1bmN0aW9uTWFwLFxyXG4gIHJldHJ5OiBudW1iZXIgPSAxXHJcbikge1xyXG4gIGlmICh0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIikge1xyXG4gICAgbG9nZ2VyLmVycm9yKFwidHJhbnNhY3Rpb24gbmFtZSBpcyBlcnJvciBmb3JtYXQsIG5hbWU6ICVzLlwiLCBuYW1lKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgaWYgKHR5cGVvZiBjb25kaXRpb25zICE9PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBoYW5kbGVycyAhPT0gXCJvYmplY3RcIikge1xyXG4gICAgbG9nZ2VyLmVycm9yKFxyXG4gICAgICBcInRyYW5zYWN0aW9uIGNvbmRpdGlvbnMgcGFyYW1ldGVyIGlzIGVycm9yIGZvcm1hdCwgY29uZGl0aW9uczogJWosIGhhbmRsZXJzOiAlai5cIixcclxuICAgICAgY29uZGl0aW9ucyxcclxuICAgICAgaGFuZGxlcnNcclxuICAgICk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBsZXQgY21ldGhvZHMgPSBbXSxcclxuICAgIGRtZXRob2RzOiBGdW5jdGlvbltdID0gW10sXHJcbiAgICBjbmFtZXM6IHN0cmluZ1tdID0gW10sXHJcbiAgICBkbmFtZXM6IHN0cmluZ1tdID0gW107XHJcbiAgZm9yIChsZXQga2V5IGluIGNvbmRpdGlvbnMpIHtcclxuICAgIGlmICh0eXBlb2Yga2V5ICE9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBjb25kaXRpb25zW2tleV0gIT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoXHJcbiAgICAgICAgXCJ0cmFuc2FjdGlvbiBjb25kaXRpb25zIHBhcmFtZXRlciBpcyBlcnJvciBmb3JtYXQsIGNvbmRpdGlvbiBuYW1lOiAlcywgY29uZGl0aW9uIGZ1bmN0aW9uOiAlai5cIixcclxuICAgICAgICBrZXksXHJcbiAgICAgICAgY29uZGl0aW9uc1trZXldXHJcbiAgICAgICk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNuYW1lcy5wdXNoKGtleSk7XHJcbiAgICBjbWV0aG9kcy5wdXNoKGNvbmRpdGlvbnNba2V5XSk7XHJcbiAgfVxyXG5cclxuICBsZXQgaSA9IDA7XHJcbiAgLy8gZXhlY3V0ZSBjb25kaXRpb25zXHJcbiAgYXN5bmMuZm9yRWFjaFNlcmllcyhcclxuICAgIGNtZXRob2RzLFxyXG4gICAgZnVuY3Rpb24obWV0aG9kOiBGdW5jdGlvbiwgY2I6IEZ1bmN0aW9uKSB7XHJcbiAgICAgIG1ldGhvZChjYik7XHJcbiAgICAgIHRyYW5zYWN0aW9uTG9nZ2VyLmluZm8oXHJcbiAgICAgICAgXCJbJXNdOlslc10gY29uZGl0aW9uIGlzIGV4ZWN1dGVkLlwiLFxyXG4gICAgICAgIG5hbWUsXHJcbiAgICAgICAgY25hbWVzW2ldXHJcbiAgICAgICk7XHJcbiAgICAgIGkrKztcclxuICAgIH0sXHJcbiAgICBmdW5jdGlvbihlcnI6IGFueSkge1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHRyYW5zYWN0aW9uTG9nZ2VyLmVycm9yKFxyXG4gICAgICAgICAgICBcIlslc106WyVzXSBjb25kaXRpb24gaXMgZXhlY3V0ZWQgd2l0aCBlcnI6ICVqLlwiLFxyXG4gICAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgICBjbmFtZXNbLS1pXSxcclxuICAgICAgICAgICAgZXJyLnN0YWNrXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgbGV0IGxvZyA9IHtcclxuICAgICAgICAgICAgbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgbWV0aG9kOiBjbmFtZXNbaV0sXHJcbiAgICAgICAgICAgIHRpbWU6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgIHR5cGU6IFwiY29uZGl0aW9uXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBlcnIuc3RhY2tcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICB0cmFuc2FjdGlvbkVycm9yTG9nZ2VyLmVycm9yKEpTT04uc3RyaW5naWZ5KGxvZykpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBleGVjdXRlIGhhbmRsZXJzXHJcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGZvciAobGV0IGtleSBpbiBoYW5kbGVycykge1xyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgdHlwZW9mIGtleSAhPT0gXCJzdHJpbmdcIiB8fFxyXG4gICAgICAgICAgICAgIHR5cGVvZiBoYW5kbGVyc1trZXldICE9PSBcImZ1bmN0aW9uXCJcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxyXG4gICAgICAgICAgICAgICAgXCJ0cmFuc2NhdGlvbiBoYW5kbGVycyBwYXJhbWV0ZXIgaXMgZXJyb3IgZm9ybWF0LCBoYW5kbGVyIG5hbWU6ICVzLCBoYW5kbGVyIGZ1bmN0aW9uOiAlai5cIixcclxuICAgICAgICAgICAgICAgIGtleSxcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzW2tleV1cclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkbmFtZXMucHVzaChrZXkpO1xyXG4gICAgICAgICAgICBkbWV0aG9kcy5wdXNoKGhhbmRsZXJzW2tleV0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGxldCBmbGFnID0gdHJ1ZTtcclxuICAgICAgICAgIGxldCB0aW1lcyA9IHJldHJ5O1xyXG5cclxuICAgICAgICAgIC8vIGRvIHJldHJ5IGlmIGZhaWxlZCB1dGlsIHJldHJ5IHRpbWVzXHJcbiAgICAgICAgICBhc3luYy53aGlsc3QoXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXRyeSA+IDAgJiYgZmxhZztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZnVuY3Rpb24oY2FsbGJhY2s6IEZ1bmN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgbGV0IGogPSAwO1xyXG4gICAgICAgICAgICAgIHJldHJ5LS07XHJcbiAgICAgICAgICAgICAgYXN5bmMuZm9yRWFjaFNlcmllcyhcclxuICAgICAgICAgICAgICAgIGRtZXRob2RzLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24obWV0aG9kOiBGdW5jdGlvbiwgY2I6IEZ1bmN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgIG1ldGhvZChjYik7XHJcbiAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uTG9nZ2VyLmluZm8oXHJcbiAgICAgICAgICAgICAgICAgICAgXCJbJXNdOlslc10gaGFuZGxlciBpcyBleGVjdXRlZC5cIixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGRuYW1lc1tqXVxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICBqKys7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbkxvZ2dlci5lcnJvcihcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJbJXNdOlslc106WyVzXSBoYW5kbGVyIGlzIGV4ZWN1dGVkIHdpdGggZXJyOiAlai5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG5hbWVzWy0tal0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzIC0gcmV0cnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVyci5zdGFja1xyXG4gICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgIGxldCBsb2cgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogZG5hbWVzW2pdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXRyeTogdGltZXMgLSByZXRyeSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZTogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJoYW5kbGVyXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBlcnIuc3RhY2tcclxuICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbkVycm9yTG9nZ2VyLmVycm9yKEpTT04uc3RyaW5naWZ5KGxvZykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgdXRpbHMuaW52b2tlQ2FsbGJhY2soY2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBmbGFnID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgIHV0aWxzLmludm9rZUNhbGxiYWNrKGNhbGxiYWNrKTtcclxuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbkxvZ2dlci5pbmZvKFxyXG4gICAgICAgICAgICAgICAgICAgICAgXCJbJXNdIGFsbCBjb25kaXRpb25zIGFuZCBoYW5kbGVycyBhcmUgZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5LlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbmFtZVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxyXG4gICAgICAgICAgICAgICAgICBcInRyYW5zYWN0aW9uIHByb2Nlc3MgaXMgZXhlY3V0ZWQgd2l0aCBlcnJvcjogJWpcIixcclxuICAgICAgICAgICAgICAgICAgZXJyXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAvLyBjYWxsYmFjayB3aWxsIG5vdCBwYXNzIGVycm9yXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICApO1xyXG59XHJcbiJdfQ==