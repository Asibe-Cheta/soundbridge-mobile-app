import './extension/IAgoraLogExtension';

/**
 * The output log level of the SDK.
 */
export let LogLevel = /*#__PURE__*/function (LogLevel) {
  LogLevel[LogLevel["LogLevelNone"] = 0] = "LogLevelNone";
  LogLevel[LogLevel["LogLevelInfo"] = 1] = "LogLevelInfo";
  LogLevel[LogLevel["LogLevelWarn"] = 2] = "LogLevelWarn";
  LogLevel[LogLevel["LogLevelError"] = 4] = "LogLevelError";
  LogLevel[LogLevel["LogLevelFatal"] = 8] = "LogLevelFatal";
  LogLevel[LogLevel["LogLevelApiCall"] = 16] = "LogLevelApiCall";
  LogLevel[LogLevel["LogLevelDebug"] = 32] = "LogLevelDebug";
  return LogLevel;
}({});

/**
 * The output log level of the SDK.
 */
export let LogFilterType = /*#__PURE__*/function (LogFilterType) {
  LogFilterType[LogFilterType["LogFilterOff"] = 0] = "LogFilterOff";
  LogFilterType[LogFilterType["LogFilterDebug"] = 2063] = "LogFilterDebug";
  LogFilterType[LogFilterType["LogFilterInfo"] = 15] = "LogFilterInfo";
  LogFilterType[LogFilterType["LogFilterWarn"] = 14] = "LogFilterWarn";
  LogFilterType[LogFilterType["LogFilterError"] = 12] = "LogFilterError";
  LogFilterType[LogFilterType["LogFilterCritical"] = 8] = "LogFilterCritical";
  LogFilterType[LogFilterType["LogFilterMask"] = 2063] = "LogFilterMask";
  return LogFilterType;
}({});

/**
 * Configuration of Agora SDK log files.
 */
export class LogConfig {}
//# sourceMappingURL=IAgoraLog.js.map