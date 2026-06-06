import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/random-character", async (req, res) => {
    try {
      const gender = req.query.gender as string;
      const source = req.query.source as string;
      const extraTagRaw = req.query.extraTag as string;

      let sourceTag = '';
      if (source && source.trim() !== '') {
        const queryTerm = source.trim().toLowerCase().replace(/\s+/g, '_');
        // Resolve closest copyright tag via Danbooru autocomplete
        try {
           const tagRes = await fetch(`https://danbooru.donmai.us/tags.json?search[name_matches]=*${queryTerm}*&search[category]=3&search[order]=count&limit=1`, {
             headers: { "User-Agent": "DanbooruRandomCharacter/1.0" }
           });
           if (tagRes.ok) {
             const tagData = await tagRes.json();
             if (tagData && tagData.length > 0) {
               sourceTag = tagData[0].name;
             } else {
               sourceTag = queryTerm;
             }
           } else {
             sourceTag = queryTerm;
           }
        } catch(e) {
           sourceTag = queryTerm;
        }
      }

      const ratingFilter = req.query.rating as string || 'sfw';

      let tags = [];
      if (ratingFilter === 'sfw') {
         tags.push("rating:g");
      } else if (ratingFilter === 'nsfw') {
         tags.push("-rating:g");
      } // 'any' adds no rating tag

      if (gender && gender !== 'any') {
        if (gender === 'trap') {
           tags.push('otoko_no_ko');
        } else if (gender === 'other') {
           tags.push('1other');
        } else {
           tags.push(gender);
        }
      }
      
      const minYear = req.query.minYear as string;
      const maxYear = req.query.maxYear as string;
      let dateTag = '';
      if (minYear || maxYear) {
         let yStart = minYear || '2000';
         let yEnd = maxYear || new Date().getFullYear().toString();
         dateTag = `date:${yStart}-01-01..${yEnd}-12-31`;
         tags.push(dateTag);
      }

      if (sourceTag) {
        tags.push(sourceTag);
      }
      
      let extraTag = '';
      if (extraTagRaw && extraTagRaw.trim() !== '') {
        extraTag = extraTagRaw.trim().toLowerCase().replace(/\s+/g, '_');
        tags.push(extraTag);
      }

      const searchMode = req.query.mode as string || 'post';

      let validPost = null;
      let fallbackPost = null;
      let attempts = 0;

      while (!validPost && attempts < 6) {
        attempts++;
        
        // Build base tags
        let currentTags = [...tags];
        let randomCharTag = '';
        
        if (searchMode === 'tag') {
           try {
             let tagUrl = 'https://danbooru.donmai.us/tags.json?search[category]=4&limit=100';
             const minTagCount = req.query.minTagCount as string;
             const maxTagCount = req.query.maxTagCount as string;
             if (minTagCount || maxTagCount) {
                const min = minTagCount || '0';
                const max = maxTagCount || '10000000';
                tagUrl += `&search[post_count]=${min}..${max}&search[order]=random`;
             } else {
                const randomPage = Math.floor(Math.random() * 500) + 1;
                tagUrl += `&search[order]=count&page=${randomPage}`;
             }
             const tagRes = await fetch(tagUrl, {
               headers: { "User-Agent": "DanbooruRandomCharacter/1.0" }
             });
             if (tagRes.ok) {
               const tagsData = await tagRes.json();
               if (tagsData && tagsData.length > 0) {
                 const randIndex = Math.floor(Math.random() * tagsData.length);
                 randomCharTag = tagsData[randIndex].name;
                 currentTags.push(randomCharTag);
               }
             }
           } catch(e) { }
        }

        // Danbooru restricts free users to 2 tags
        // If we have more than 2, priority is: randomCharTag > extraTag > sourceTag > gender > dateTag > rating:g
        if (currentTags.length > 2) {
           currentTags = currentTags.filter(t => t !== 'rating:g');
        }
        if (currentTags.length > 2 && currentTags.includes(gender)) {
           currentTags = currentTags.filter(t => t !== gender);
        }
        if (currentTags.length > 2 && currentTags.includes('otoko_no_ko')) {
           currentTags = currentTags.filter(t => t !== 'otoko_no_ko');
        }
        if (currentTags.length > 2 && currentTags.includes('1other')) {
           currentTags = currentTags.filter(t => t !== '1other');
        }
        if (currentTags.length > 2 && dateTag) {
           currentTags = currentTags.filter(t => t !== dateTag);
        }
        // If still > 2 and both source and randomChar tag exist, drop source
        if (currentTags.length > 2 && sourceTag && currentTags.includes(sourceTag)) {
           currentTags = currentTags.filter(t => t !== sourceTag);
        }
        // If still > 2, drop extra tag
        if (currentTags.length > 2 && extraTag && currentTags.includes(extraTag)) {
           currentTags = currentTags.filter(t => t !== extraTag);
        }

        let tagsQuery = currentTags.join('+');

        let response = await fetch(`https://danbooru.donmai.us/posts/random.json?tags=${tagsQuery}`, {
          headers: {
            "User-Agent": "DanbooruRandomCharacter/1.0",
            "Accept": "application/json"
          }
        });
        
        if (!response.ok && response.status === 500) {
           // Fallback to order:random
           response = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tagsQuery}+order:random&limit=1`, {
              headers: {
                "User-Agent": "DanbooruRandomCharacter/1.0",
                "Accept": "application/json"
              }
           });
        }

        if (!response.ok) {
          if (response.status === 404 || response.status === 500) {
            continue; // Could just be a dead combo, retry
          }
          throw new Error(`Danbooru API error: ${response.status}`);
        }
        
        let post = await response.json();
        if (Array.isArray(post)) {
           if (post.length === 0) continue;
           post = post[0];
        }

        if (post && post.file_url) {
          // Manual SFW check if rating:g was dropped but requested 'sfw'
          if (ratingFilter === 'sfw' && !currentTags.includes('rating:g') && post.rating !== 'g' && post.rating !== 's') {
            continue;
          }
          if (!fallbackPost) fallbackPost = post;
          if (post.tag_string_character && post.tag_string_copyright) {
            validPost = post;
          }
        }
      }
      
      const finalPost = validPost || fallbackPost;

      if (finalPost) {
        res.json({
          character: finalPost.tag_string_character?.split(' ')[0] || "original_character",
          copyright: finalPost.tag_string_copyright?.split(' ')[0] || "original",
          imageUrl: finalPost.file_url,
          sourceUrl: `https://danbooru.donmai.us/posts/${finalPost.id}`
        });
      } else {
         const isTagMode = searchMode === 'tag';
         const hasFilters = gender !== 'any' || sourceTag !== '';
         if (isTagMode && hasFilters) {
           res.status(404).json({ error: "Random character not found matching this filter. Try Mode: Random Image." });
         } else {
           res.status(404).json({ error: "No suitable post found." });
         }
      }

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch from Danbooru" });
    }
  });

  app.get("/api/tag-info", async (req, res) => {
    const { tag } = req.query;
    if (!tag || typeof tag !== 'string') {
       return res.status(400).json({ error: "Missing tag parameter." });
    }
    try {
       // Fetch tag metadata
       let tagsData: any[] = [];
       try {
          const tagRes = await fetch(`https://danbooru.donmai.us/tags.json?search[name]=${encodeURIComponent(tag)}`, {
             headers: { "User-Agent": "DanbooruRandomCharacter/1.0" }
          });
          if (tagRes.ok) tagsData = await tagRes.json();
       } catch(e) {}
       
       const tagInfo = tagsData[0] || null;

       // Fetch wiki page for aliases/description
       let wikiData: any[] = [];
       try {
          const wikiRes = await fetch(`https://danbooru.donmai.us/wiki_pages.json?search[title]=${encodeURIComponent(tag)}`, {
             headers: { "User-Agent": "DanbooruRandomCharacter/1.0" }
          });
          if (wikiRes.ok) wikiData = await wikiRes.json();
       } catch(e) {}

       const wikiInfo = wikiData[0] || null;
       
       let relatedTags: string[] = [];
       if (tagInfo) {
          try {
             // We can just ask Danbooru for related tags using query parameter
             const relatedRes = await fetch(`https://danbooru.donmai.us/related_tag.json?query=${encodeURIComponent(tag)}`, {
                headers: { "User-Agent": "DanbooruRandomCharacter/1.0" }
             });
             if (relatedRes.ok) {
                const relData = await relatedRes.json();
                if (relData && relData.tags) {
                   relatedTags = relData.tags.map((t: any) => t.name).slice(0, 10);
                } else if (relData && relData.query && relData.related) {
                   relatedTags = relData.related.map((t: any) => t[0]).slice(0, 10);
                } else if (Array.isArray(relData)) {
                   relatedTags = relData.map(t => t.name || t[0]).filter(Boolean).slice(0, 10);
                }
             }
          } catch(e) {}
       }

       res.json({
          tag: tagInfo ? tagInfo.name : tag,
          postCount: tagInfo ? tagInfo.post_count : 'Unknown',
          category: tagInfo ? tagInfo.category : 0,
          aliases: wikiInfo && wikiInfo.other_names ? wikiInfo.other_names : [],
          description: wikiInfo ? wikiInfo.body : 'No description available.',
          relatedTags: relatedTags,
          updatedAt: tagInfo ? tagInfo.updated_at : null
       });

    } catch (error) {
       console.error("Danbooru Tag Info API error:", error);
       res.status(500).json({ error: "Failed to fetch tag info." });
    }
  });

  app.get("/api/tag-suggestions", async (req, res) => {
    try {
      const q = req.query.q as string;
      const category = req.query.category as string;
      if (!q || q.length < 2) return res.json([]);
      
      let url = `https://danbooru.donmai.us/tags.json?search[name_matches]=*${encodeURIComponent(q.trim().replace(/\s+/g, '_'))}*&search[order]=count&limit=10`;
      
      if (category) {
        url += `&search[category]=${encodeURIComponent(category)}`;
      }

      const tagRes = await fetch(url, {
        headers: { "User-Agent": "DanbooruRandomCharacter/1.0" }
      });
      
      if (!tagRes.ok) {
        return res.status(tagRes.status).json([]);
      }
      
      const tagsData = await tagRes.json();
      res.json(tagsData.map((t: any) => ({
        name: t.name,
        postCount: t.post_count,
        category: t.category
      })));
    } catch (error) {
      console.error("Autosuggest API error:", error);
      res.status(500).json([]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
