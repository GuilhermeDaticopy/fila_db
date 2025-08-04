import { MediaQueryAllQueryable, MediaQueryMatchers } from 'react-responsive/types/types';
type MediaQuerySettings = Partial<MediaQueryAllQueryable & {
    query?: string;
}>;
declare const useMediaQuery: (settings: MediaQuerySettings, device?: MediaQueryMatchers, onChange?: ((_: boolean) => void) | undefined) => boolean;
export default useMediaQuery;
