import React from 'react';

interface AnimatedBackgroundProps {
    themeName?: string;
    customVideo?: string;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ themeName = 'default', customVideo }) => {
    // Show custom video if provided
    if (customVideo) {
        return (
            <div
                key={`custom-${customVideo}`} // Force re-render on video change
                className="fixed inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
            >
                {/* Custom Video Background */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        opacity: 1,
                        zIndex: 0,
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden'
                    }}
                    src={customVideo}
                    onError={(e) => console.error('Custom video failed to load:', e)}
                />

                {/* Standard gradient overlay for readability */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50"
                    style={{ zIndex: 1 }}
                ></div>
            </div>
        );
    }
    // Show video background for retrowave theme
    if (themeName === 'retrowave') {
        return (
            <div
                key="retrowave-bg"
                className="fixed inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
            >
                {/* Video Background */}
                <video
                    key="retrowave-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        filter: 'brightness(0.9) saturate(1.2)', // Reduced saturation, removed complex filters if any were planned
                        opacity: 1,
                        zIndex: 0,
                        transform: 'translate3d(0, 0, 0)', // Force GPU
                        backfaceVisibility: 'hidden'
                    }}
                    onError={(e) => console.error('Video failed to load:', e)}
                    onLoadedData={() => console.log('Video loaded successfully')}
                >
                    <source src="21368-317182818.mp4" type="video/mp4" />
                </video>

                {/* Gradient overlay */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50"
                    style={{ zIndex: 1 }}
                ></div>
            </div>
        );
    }

    // Show video background for cyberpunk theme
    if (themeName === 'cyberpunk') {
        return (
            <div
                key="cyberpunk-bg"
                className="fixed inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
            >
                {/* Video Background */}
                <video
                    key="cyberpunk-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        filter: 'brightness(0.6) contrast(1.1)', // Removed hue-rotate, simplified
                        opacity: 1,
                        zIndex: 0,
                        transform: 'translate3d(0, 0, 0)', // Force GPU
                        backfaceVisibility: 'hidden'
                    }}
                    onError={(e) => console.error('Video failed to load:', e)}
                    onLoadedData={() => console.log('Video loaded successfully')}
                >
                    <source src="cyberpunk.mp4" type="video/mp4" />
                </video>

                {/* Gradient overlay */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"
                    style={{ zIndex: 1 }}
                ></div>
            </div>
        );
    }

    // Show video background for zengarden theme
    if (themeName === 'zengarden') {
        return (
            <div
                key="zengarden-bg"
                className="fixed inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
            >
                {/* Video Background */}
                <video
                    key="zengarden-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        filter: 'brightness(0.8) contrast(1.05) saturate(1.1)', // Natural look with slight pop
                        opacity: 1,
                        zIndex: 0,
                        transform: 'translate3d(0, 0, 0)', // Force GPU
                        backfaceVisibility: 'hidden'
                    }}
                    onError={(e) => console.error('Video failed to load:', e)}
                    onLoadedData={() => console.log('Video loaded successfully')}
                >
                    <source src="zengarden.mp4" type="video/mp4" />
                </video>

                {/* Gradient overlay - slightly greenish/natural tint mixed with dark for readability */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-black/40 via-green-950/10 to-black/60"
                    style={{ zIndex: 1 }}
                ></div>
            </div>
        );
    }

    // Show video background for trippy theme
    if (themeName === 'trippy') {
        return (
            <div
                key="trippy-bg"
                className="fixed inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
            >
                {/* Video Background */}
                <video
                    key="trippy-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        filter: 'contrast(1.2) saturate(1.3)', // Removed expensive hue-rotate
                        opacity: 1,
                        zIndex: 0,
                        transform: 'translate3d(0, 0, 0)', // Force GPU
                        backfaceVisibility: 'hidden',
                        willChange: 'transform' // Hint to browser
                    }}
                    onError={(e) => console.error('Video failed to load:', e)}
                    onLoadedData={() => console.log('Video loaded successfully')}
                >
                    <source src="trippy.mp4" type="video/mp4" />
                </video>

                {/* Gradient overlay - purple/teal mix for hallucination effect */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-transparent to-teal-900/40 mix-blend-overlay"
                    style={{ zIndex: 1 }}
                ></div>

                {/* Animated color shift overlay */}
                <div
                    className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 mix-blend-color-dodge animate-pulse"
                    style={{ zIndex: 2, animationDuration: '3s' }}
                ></div>
            </div>
        );
    }

    // Custom Theme with Video
    if (themeName !== 'default' && themeName !== 'trippy' && themeName !== 'cyberpunk' && themeName !== 'retrowave' && themeName !== 'zengarden') {
        // Try to find if it's a custom theme with a video
        // Since we only receive themeName here, we need to look it up or rely on logic.
        // But better yet, let's update AnimatedBackground to accept the full Theme object, 
        // OR we can just check if we can retrieve it from THEMES + Custom logic if we had access.
        // However, App.tsx passes `currentTheme.name`. 
        // Let's assume we can also pass the `customVideo` prop for cleaner separation, 
        // OR we just use validity of the name. 
        // Wait, the safest way is to pass the `customVideo` url as a prop if it exists.
    }

    return (
        <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden bg-premium-black">
            {/* Dark gradient base */}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>

            {/* Floating orbs with actual movement */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/30 rounded-full blur-[120px] mix-blend-screen animate-float-1"></div>
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-neon-blue/20 rounded-full blur-[120px] mix-blend-screen animate-float-2"></div>
            <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-pink-500/15 rounded-full blur-[100px] mix-blend-screen animate-float-3"></div>

            {/* Additional moving accent orbs */}
            <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-cyan-400/20 rounded-full blur-[80px] mix-blend-screen animate-float-4"></div>
            <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-violet-500/15 rounded-full blur-[100px] mix-blend-screen animate-float-5"></div>

            {/* Animated gradient overlay */}
            <div className="absolute inset-0 opacity-30 animate-gradient-shift"
                style={{
                    background: 'linear-gradient(45deg, transparent, rgba(77, 159, 255, 0.1), transparent, rgba(181, 55, 242, 0.1), transparent)',
                    backgroundSize: '400% 400%'
                }}>
            </div>

            {/* Subtle grid overlay for tech/audio feel */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150"></div>
            <div className="absolute inset-0 animate-grid-pulse"
                style={{
                    backgroundImage: 'linear-gradient(rgba(77, 159, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(181, 55, 242, 0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}>
            </div>

            {/* Animated particles */}
            {[...Array(20)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/40 rounded-full animate-particle"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${3 + Math.random() * 4}s`
                    }}
                ></div>
            ))}
        </div>
    );
};

export default AnimatedBackground;
