// components/VoiceInputField.jsx
import React from "react";

const VoiceInputField = ({ label, name, value, active, isError = null }) => {
  //   const isError = value === "" && !active;
  const isSuccess = value !== "" && !active;
  const isListening = active;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Input Container */}
      <div
        className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden ${
          isListening
            ? "border-blue-500 bg-blue-50"
            : isSuccess
            ? "border-emerald-500 bg-emerald-50"
            : isError
            ? "border-red-500 bg-red-50"
            : "border-gray-300 bg-white"
        }`}
      >
        {/* Input */}
        <div className="px-4 py-3 flex items-center justify-between capitalize">
          <div className="flex-1">
            <p
              className={`text-xs font-medium mb-1 ${
                isListening
                  ? "text-blue-600"
                  : isSuccess
                  ? "text-emerald-600"
                  : isError
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {name}
            </p>
            <input
              id={name}
              name={name}
              type="text"
              value={value}
              disabled
              className={`border-0 bg-transparent w-full text-lg font-medium outline-none disabled:cursor-default ${
                isListening
                  ? "text-blue-700"
                  : isSuccess
                  ? "text-emerald-700"
                  : isError
                  ? "text-red-700"
                  : "text-gray-800"
              }`}
              placeholder={value === "" ? label : ""}
            />
          </div>

          {/* Icon */}
          <div className="ml-3 shrink-0">
            {isListening && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            )}
            {isSuccess && (
              <div className="flex items-center justify-center w-6 h-6 bg-emerald-500 rounded-full">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
            {isError && <div className="text-red-500 font-bold text-xl">✕</div>}
          </div>
        </div>
      </div>

      {/* Helper Text */}
      {/* <div className="px-1">
        {isListening && (
          <p className="text-sm font-medium text-blue-600 flex items-center gap-1">
            <span className="animate-pulse">🎙️</span> Listening for{" "}
            {label.toLowerCase()}...
          </p>
        )}
        {isSuccess && (
          <p className="text-sm font-medium text-emerald-600 flex items-center gap-1">
            <span>✅</span> {label} is captured!
          </p>
        )}
        {isError && (
          <p className="text-sm font-medium text-red-600 flex items-center gap-1">
            <span>⚠️</span> Waiting for {label.toLowerCase()}...
          </p>
        )}
      </div> */}
    </div>
  );
};

export default VoiceInputField;
