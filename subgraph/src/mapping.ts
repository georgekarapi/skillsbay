import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { SkillPurchased, SkillRegistered, SkillUpdated } from "../generated/SkillRegistry/SkillRegistry"
import { Author, DailySkillStat, Purchase, Skill } from "../generated/schema"

function authorFor(id: Bytes): Author {
  let author = Author.load(id)
  if (author == null) {
    author = new Author(id)
    author.totalSales = 0
    author.grossRevenue = BigInt.zero()
    author.save()
  }
  return author
}

export function handleSkillRegistered(event: SkillRegistered): void {
  const skill = new Skill(event.params.skillId)
  const author = authorFor(event.params.author)
  skill.author = author.id
  skill.price = event.params.price
  skill.majorVersion = event.params.majorVersion.toI32()
  skill.metadataURI = event.params.metadataURI
  skill.active = true
  skill.totalSales = 0
  skill.grossVolume = BigInt.zero()
  skill.createdAt = event.block.timestamp
  skill.updatedAt = event.block.timestamp
  skill.save()
}

export function handleSkillUpdated(event: SkillUpdated): void {
  const skill = Skill.load(event.params.skillId)
  if (skill == null) return
  skill.price = event.params.price
  skill.active = event.params.active
  skill.metadataURI = event.params.metadataURI
  skill.updatedAt = event.block.timestamp
  skill.save()
}

export function handleSkillPurchased(event: SkillPurchased): void {
  const skill = Skill.load(event.params.skillId)
  if (skill == null) return
  const purchase = new Purchase(event.transaction.hash.concatI32(event.logIndex.toI32()))
  purchase.skill = skill.id
  purchase.buyer = event.params.buyer
  purchase.amount = event.params.amount
  purchase.paymentTxHash = event.params.paymentTxHash
  purchase.blockNumber = event.block.number
  purchase.timestamp = event.block.timestamp
  purchase.transactionHash = event.transaction.hash
  purchase.save()

  skill.totalSales += 1
  skill.grossVolume = skill.grossVolume.plus(event.params.amount)
  skill.save()

  const author = authorFor(skill.author)
  author.totalSales += 1
  author.grossRevenue = author.grossRevenue.plus(event.params.authorAmount)
  author.save()

  const day = event.block.timestamp.toI32() / 86_400
  const statId = skill.id.toHexString().concat("-").concat(day.toString())
  let stat = DailySkillStat.load(statId)
  if (stat == null) {
    stat = new DailySkillStat(statId)
    stat.skill = skill.id
    stat.day = day
    stat.purchases = 0
    stat.volume = BigInt.zero()
  }
  stat.purchases += 1
  stat.volume = stat.volume.plus(event.params.amount)
  stat.save()
}
