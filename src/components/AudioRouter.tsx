import React from 'react';
import { useAudioRouter, type AudioDevice } from '../hooks/useAudioRouter';

export const AudioRouter: React.FC = () => {
    const {
        isCapturing,
        devices,
        selectedDeviceIds,
        startCapture,
        stopCapture,
        toggleDevice,
        refreshDevices
    } = useAudioRouter();

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 w-full max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                🎵 Multi-Device Audio Router
            </h2>

            <div className="mb-6">
                {!isCapturing ? (
                    <button
                        onClick={startCapture}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                        <span>Start System Audio Capture</span>
                    </button>
                ) : (
                    <button
                        onClick={stopCapture}
                        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                        <span>Stop Capture</span>
                    </button>
                )}

                <p className="text-xs text-gray-400 mt-2 text-center">
                    Note: Select "System Audio" in the browser popup.
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Output Devices</h3>
                    <button onClick={refreshDevices} className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                        Refresh List
                    </button>
                </div>

                {devices.length === 0 ? (
                    <div className="text-center py-4 bg-gray-900/50 rounded-lg text-gray-500 text-sm">
                        No audio outputs detected. <br /> Check permissions or connect a device.
                    </div>
                ) : (
                    <div className="bg-gray-900/50 rounded-lg divide-y divide-gray-700 max-h-60 overflow-y-auto">
                        {devices.map((device: AudioDevice) => (
                            <label
                                key={device.deviceId}
                                className={`flex items-center p-3 cursor-pointer hover:bg-gray-800 transition ${selectedDeviceIds.has(device.deviceId) ? 'bg-indigo-900/20' : ''
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedDeviceIds.has(device.deviceId)}
                                    onChange={() => toggleDevice(device.deviceId)}
                                    disabled={!isCapturing}
                                    className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500 bg-gray-700 border-gray-600"
                                />
                                <div className="ml-3 overflow-hidden">
                                    <div className="text-sm font-medium text-gray-200 truncate">
                                        {device.label}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        ID: {device.deviceId.slice(0, 8)}...
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {isCapturing && (
                <div className="mt-4 p-3 bg-indigo-900/30 border border-indigo-800 rounded text-sm text-indigo-200">
                    <span className="font-bold">Active:</span> Audio is being routed to {selectedDeviceIds.size} device(s).
                </div>
            )}
        </div>
    );
};
