// Location translation utilities

import { countryTranslations } from '../data/translations';
import { globalFriendsData } from '../data/friends';

export function translateLocation(location, language) {
    if (!location) return location;
    const parts = location.split(',').map(p => p.trim());
    const translatedParts = parts.map(part => {
        const translation = countryTranslations[part];
        return translation ? translation[language] || part : part;
    });
    return translatedParts.join(', ');
}

export function enrichFriendData(simpleFriend) {
    const fullData = globalFriendsData[simpleFriend.id];
    return fullData ? { ...simpleFriend, ...fullData } : simpleFriend;
}
