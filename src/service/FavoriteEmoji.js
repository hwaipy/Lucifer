class FavoriteEmoji {
  constructor(worker, collection) {
    this.worker = worker
    this.collection = collection
    this.emojis = []
    this.onEmojiListUpdate = () => { }
  }

  async fetchAllEmojiMeta() {
    const allEmojis = await this.worker.Storage.latest(this.collection, 'FetchTime', undefined, {
      '_id': 1,
      'Data.Size': 1,
      'Data.MD5': 1,
      'Data.Type': 1
    }, 1000)
    return allEmojis
  }

  async updateEmojiList() {
    const allEmojis = await this.fetchAllEmojiMeta()
    if (allEmojis == null) return
    localStorage.setItem("emojis hashes", JSON.stringify(allEmojis))
    this.emojis = allEmojis.map((eMeta) => {
      return new Emoji(eMeta._id, eMeta.Data.Size, eMeta.Data.MD5, eMeta.Data.Type, undefined)
    })
    this.onEmojiListUpdate()
    for (const i in this.emojis) {
      const emoji = this.emojis[i]
      const content = await this.worker.Storage.get(this.collection, emoji.id, '_id', {
        '_id': 1,
        'Data.Content': 1
      })
      emoji.updateContent(content.Data.Content)
    }
  }
}

class Emoji {
  constructor(id, size, md5, type, content) {
    this.id = id
    this.size = size
    this.md5 = md5
    this.type = type
    this.content = content
    this.onContentChange = () => { }
  }

  updateContent(c) {
    this.content = c
    this.onContentChange()
  }
}

export default FavoriteEmoji