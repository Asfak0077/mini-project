import React from 'react'

const BackgroundAnimation: React.FC = React.memo(() => {
    return (
        <div className="animated-background pointer-events-none">
            <div className="gradient-orb gradient-orb-1"></div>
            <div className="gradient-orb gradient-orb-2"></div>
            <div className="gradient-orb gradient-orb-3"></div>
        </div>
    )
})

BackgroundAnimation.displayName = 'BackgroundAnimation'

export default BackgroundAnimation
