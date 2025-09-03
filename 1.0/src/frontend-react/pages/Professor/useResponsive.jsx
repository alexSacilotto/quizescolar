import { useMediaQuery } from 'react-responsive';

export const useResponsive = () => {
    const isMobile = useMediaQuery({ maxWidth: 768 });
    const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
    const isDesktop = useMediaQuery({ minWidth: 1025 });

    return {
        isMobile,
        isTablet,
        isDesktop,
        deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
    };
};