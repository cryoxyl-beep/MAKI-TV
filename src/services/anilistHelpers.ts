export async function enrichWithAniListImages(results: any[], fetchAniList: any): Promise<void> {
  const malIds = results.map(r => r.id);
  if (malIds.length === 0) return;
  
  const query = `
    query ($idMal_in: [Int]) {
      Page(page: 1, perPage: 50) {
        media(idMal_in: $idMal_in, type: ANIME) {
          idMal
          coverImage { extraLarge large medium color }
          bannerImage
        }
      }
    }
  `;
  try {
    const aniData = await fetchAniList(query, { idMal_in: malIds });
    const mediaList = aniData?.Page?.media || [];
    const aniMap = new Map();
    for (const m of mediaList) {
      if (m.idMal) aniMap.set(m.idMal, m);
    }
    for (const r of results) {
      const aniMedia = aniMap.get(r.id);
      if (aniMedia) {
        if (aniMedia.coverImage) {
          r.coverImage = {
            extraLarge: aniMedia.coverImage.extraLarge || aniMedia.coverImage.large || r.coverImage.extraLarge,
            large: aniMedia.coverImage.large || aniMedia.coverImage.extraLarge || r.coverImage.large,
            medium: aniMedia.coverImage.medium || r.coverImage.medium,
            color: aniMedia.coverImage.color || r.coverImage.color
          };
        }
        if (aniMedia.bannerImage) {
          r.bannerImage = aniMedia.bannerImage;
        }
      }
    }
  } catch (err) {}
}
