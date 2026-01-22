import React from 'react';

interface AnimatedBackgroundProps {
    themeName?: string;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ themeName = 'default' }) => {
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
                        filter: 'brightness(0.7) saturate(1.4)',
                        opacity: 1,
                        zIndex: 0
                    }}
                    onError={(e) => console.error('Video failed to load:', e)}
                    onLoadedData={() => console.log('Video loaded successfully')}
                >
                    <source src="/21368-317182818.mp4" type="video/mp4" />
                </video>

                {/* Gradient overlay */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50"
                    style={{ zIndex: 1 }}
                ></div>
            </div>
        );
    }

    // Default animated background for other themes
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
