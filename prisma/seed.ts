import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TopicStatus } from "../lib/generated/prisma/client";
import { buildSearchText, normalizeTitle } from "../lib/utils";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";
const DEMO_VIDEO_ID = "aqz-KE-bpKQ";

function topicData(input: {
  title: string;
  slug: string;
  category: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  lastDiscussedAt: Date;
}) {
  return {
    ...input,
    normalizedTitle: normalizeTitle(input.title),
    status: TopicStatus.APPROVED,
    searchText: buildSearchText(input),
  };
}

async function main() {
  await prisma.discussion.deleteMany();
  await prisma.topicCandidate.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.meeting.deleteMany();

  const meetingA = await prisma.meeting.create({
    data: {
      title: "[DEMO] Attorney Meeting — September 4, 2026",
      meetingDate: new Date("2026-09-04T12:00:00.000Z"),
      videoUrl: DEMO_VIDEO_URL,
      youtubeVideoId: DEMO_VIDEO_ID,
      participants: ["Laura James", "Ryan"],
      status: "PROCESSED",
      processedAt: new Date("2026-09-04T18:00:00.000Z"),
      transcript: `[DEMO PLACEHOLDER TRANSCRIPT — not an actual RJL meeting]

00:12 Laura: This is demo material for the Knowledge Hub. Let's talk through treatment gaps.
01:05 Ryan: If a client stops treating for several months, the carrier will argue causation.
02:10 Laura: We should also look at whether a low property-damage case has enough medical to keep.
04:20 Ryan: And if the client is not communicating, we may need to talk about disengaging.`,
    },
  });

  const meetingB = await prisma.meeting.create({
    data: {
      title: "[DEMO] Attorney Meeting — September 18, 2026",
      meetingDate: new Date("2026-09-18T12:00:00.000Z"),
      videoUrl: DEMO_VIDEO_URL,
      youtubeVideoId: DEMO_VIDEO_ID,
      participants: ["Laura James", "Jesús"],
      status: "PROCESSED",
      processedAt: new Date("2026-09-18T18:00:00.000Z"),
      transcript: `[DEMO PLACEHOLDER TRANSCRIPT — not an actual RJL meeting]

00:20 Laura: Demo follow-up on treatment gaps, then Airbnb premises and UM/UIM.
02:40 Jesús: Trucking cases still need a different evaluation than ordinary auto files.
05:15 Laura: Premises cases involving short-term rentals raise notice questions.`,
    },
  });

  const gaps = await prisma.topic.create({
    data: topicData({
      title: "Gaps in Medical Treatment",
      slug: "gaps-in-medical-treatment",
      category: "Medical",
      summary:
        "DEMO PLACEHOLDER. In these sample meetings, attorneys discussed how unexplained pauses in treatment can become a causation argument. This is not RJL legal guidance.",
      keyPoints: [
        "DEMO: Unexplained treatment gaps are often used to attack medical causation.",
        "DEMO: The group wanted a clear explanation for why a client stopped treating.",
        "DEMO: Thin medical follow-up can change how a file is evaluated.",
      ],
      keywords: ["treatment gap", "medical treatment", "causation", "stopped treating"],
      lastDiscussedAt: meetingB.meetingDate,
    }),
  });

  const airbnb = await prisma.topic.create({
    data: topicData({
      title: "Airbnb Premises Liability Cases",
      slug: "airbnb-premises-liability-cases",
      category: "Premises Liability",
      summary:
        "DEMO PLACEHOLDER. Sample discussion about short-term rental premises claims and who may have had notice of a hazard. Not actual firm policy.",
      keyPoints: [
        "DEMO: Short-term rental cases can raise notice and control questions.",
        "DEMO: Identify the property owner, host, and any management company early.",
      ],
      keywords: ["airbnb", "premises liability", "short-term rental", "notice"],
      lastDiscussedAt: meetingB.meetingDate,
    }),
  });

  const lowPd = await prisma.topic.create({
    data: topicData({
      title: "Evaluating Low Property Damage Cases",
      slug: "evaluating-low-property-damage-cases",
      category: "Auto Accidents",
      summary:
        "DEMO PLACEHOLDER. Sample notes on whether a low property-damage crash has enough injury evidence to keep. Not a case-acceptance rule.",
      keyPoints: [
        "DEMO: Low visible property damage often becomes a defense theme.",
        "DEMO: The medical picture still has to make sense next to the impact.",
      ],
      keywords: ["low property damage", "auto accident", "case evaluation"],
      lastDiscussedAt: meetingA.meetingDate,
    }),
  });

  const disengage = await prisma.topic.create({
    data: topicData({
      title: "When to Disengage a Client",
      slug: "when-to-disengage-a-client",
      category: "Client Management",
      summary:
        "DEMO PLACEHOLDER. Sample conversation about ending representation when communication or cooperation breaks down. Not a substitute for the firm's actual withdrawal process.",
      keyPoints: [
        "DEMO: Repeated non-communication was discussed as a reason to reassess the relationship.",
        "DEMO: Any disengagement still has to follow the firm's process and ethical rules.",
      ],
      keywords: ["disengage", "client management", "communication", "withdrawal"],
      lastDiscussedAt: meetingA.meetingDate,
    }),
  });

  const umuim = await prisma.topic.create({
    data: topicData({
      title: "UM/UIM Coverage Issues",
      slug: "um-uim-coverage-issues",
      category: "Insurance",
      summary:
        "DEMO PLACEHOLDER. Sample discussion of uninsured and underinsured motorist coverage questions that can change case value. Not coverage advice.",
      keyPoints: [
        "DEMO: Confirm UM/UIM limits and stacking questions early.",
        "DEMO: Coverage issues can matter as much as liability facts.",
      ],
      keywords: ["UM", "UIM", "uninsured motorist", "coverage"],
      lastDiscussedAt: meetingB.meetingDate,
    }),
  });

  const trucking = await prisma.topic.create({
    data: topicData({
      title: "Commercial Trucking Case Evaluation",
      slug: "commercial-trucking-case-evaluation",
      category: "Trucking",
      summary:
        "DEMO PLACEHOLDER. Sample notes on why commercial trucking files may need a different investigation than ordinary auto cases. Not a litigation playbook.",
      keyPoints: [
        "DEMO: Preserve logs, ECM data, and company policies sooner rather than later.",
        "DEMO: Trucking files can involve different defendants and insurance layers.",
      ],
      keywords: ["trucking", "commercial vehicle", "case evaluation", "ECM"],
      lastDiscussedAt: meetingB.meetingDate,
    }),
  });

  await prisma.discussion.createMany({
    data: [
      {
        topicId: gaps.id,
        meetingId: meetingA.id,
        startSeconds: 12,
        endSeconds: 130,
        sourceSummary:
          "DEMO: First meeting flagged unexplained treatment gaps as a likely causation argument.",
        transcriptExcerpt:
          "Laura: Let's talk through treatment gaps. Ryan: If a client stops treating for several months, the carrier will argue causation.",
        speakers: ["Laura James", "Ryan"],
      },
      {
        topicId: gaps.id,
        meetingId: meetingB.id,
        startSeconds: 20,
        endSeconds: 95,
        sourceSummary:
          "DEMO: Later meeting returned to treatment gaps and treated them as an ongoing evaluation issue.",
        transcriptExcerpt:
          "Laura: Demo follow-up on treatment gaps, then Airbnb premises and UM/UIM.",
        speakers: ["Laura James", "Jesús"],
      },
      {
        topicId: lowPd.id,
        meetingId: meetingA.id,
        startSeconds: 130,
        endSeconds: 250,
        sourceSummary:
          "DEMO: Attorneys discussed whether a low property-damage case had enough medical to keep.",
        transcriptExcerpt:
          "Laura: We should also look at whether a low property-damage case has enough medical to keep.",
        speakers: ["Laura James", "Ryan"],
      },
      {
        topicId: disengage.id,
        meetingId: meetingA.id,
        startSeconds: 250,
        endSeconds: 320,
        sourceSummary:
          "DEMO: The group discussed reassessing representation if a client stops communicating.",
        transcriptExcerpt:
          "Ryan: And if the client is not communicating, we may need to talk about disengaging.",
        speakers: ["Laura James", "Ryan"],
      },
      {
        topicId: airbnb.id,
        meetingId: meetingB.id,
        startSeconds: 300,
        endSeconds: 420,
        sourceSummary:
          "DEMO: Short-term rental premises claims were discussed as raising notice and control questions.",
        transcriptExcerpt:
          "Laura: Premises cases involving short-term rentals raise notice questions.",
        speakers: ["Laura James", "Jesús"],
      },
      {
        topicId: umuim.id,
        meetingId: meetingB.id,
        startSeconds: 95,
        endSeconds: 160,
        sourceSummary: "DEMO: UM/UIM coverage was listed as an issue that can change case value.",
        transcriptExcerpt:
          "Laura: Demo follow-up on treatment gaps, then Airbnb premises and UM/UIM.",
        speakers: ["Laura James", "Jesús"],
      },
      {
        topicId: trucking.id,
        meetingId: meetingB.id,
        startSeconds: 160,
        endSeconds: 280,
        sourceSummary:
          "DEMO: Trucking files were described as needing a different evaluation than ordinary auto cases.",
        transcriptExcerpt:
          "Jesús: Trucking cases still need a different evaluation than ordinary auto files.",
        speakers: ["Laura James", "Jesús"],
      },
    ],
  });

  console.info("Seeded demo meetings and placeholder topics.");
}

main()
  .catch((error) => {
    console.error("Seed failed");
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
