import jsPDF from 'jspdf';

export const generatePDFNotes = (subject, topic, studentName) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header background rect
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AI Tutor SaaS — Study Notes", margin, 22);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Subject: ${subject}  |  Topic: ${topic}`, margin, 35);

    // Meta
    doc.setTextColor(100, 100, 120);
    doc.setFontSize(10);
    doc.text(`Student: ${studentName}`, margin, 58);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, margin, 68);

    // Divider
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(margin, 74, pageWidth - margin, 74);

    const notes = getNoteContent(subject, topic);
    let y = 84;

    notes.forEach((section) => {
        if (y > 260) {
            doc.addPage();
            y = 20;
        }

        // Section heading
        doc.setFillColor(240, 242, 255);
        doc.rect(margin - 2, y - 7, pageWidth - margin * 2 + 4, 10, 'F');
        doc.setTextColor(60, 60, 180);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(section.heading, margin, y);
        y += 12;

        // Section body
        doc.setTextColor(40, 40, 60);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);

        section.points.forEach((line) => {
            if (y > 275) { doc.addPage(); y = 20; }
            const wrapped = doc.splitTextToSize(`• ${line}`, pageWidth - margin * 2);
            doc.text(wrapped, margin + 4, y);
            y += wrapped.length * 6 + 4;
        });

        y += 8;
    });

    // Footer
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFillColor(245, 245, 255);
        doc.rect(0, 285, pageWidth, 12, 'F');
        doc.setTextColor(140, 140, 160);
        doc.setFontSize(9);
        doc.text(`AI Tutor SaaS Platform — Personalized Notes`, margin, 292);
        doc.text(`Page ${i} of ${pages}`, pageWidth - margin - 20, 292);
    }

    doc.save(`${subject}_${topic}_Notes.pdf`);
};

const getNoteContent = (subject, topic) => {
    const allNotes = {
        "Trigonometry": [
            { heading: "1. Introduction to Trigonometry", points: ["Trigonometry studies relationships between sides and angles of triangles", "Three primary ratios: sin, cos, tan", "Derived ratios: cosec, sec, cot"] },
            { heading: "2. Key Formulas", points: ["sin²θ + cos²θ = 1", "1 + tan²θ = sec²θ", "1 + cot²θ = cosec²θ", "sin(A+B) = sinA cosB + cosA sinB", "cos(A+B) = cosA cosB − sinA sinB"] },
            { heading: "3. Special Angles", points: ["sin 0° = 0, sin 30° = 1/2, sin 45° = √2/2, sin 60° = √3/2, sin 90° = 1", "cos values are opposite: cos 0°=1, cos 90°=0", "tan 45° = 1, tan 60° = √3"] },
            { heading: "4. Applications", points: ["Height and distance problems", "Navigation and surveying", "Physics — wave mechanics and oscillations"] },
        ],
        "Calculus": [
            { heading: "1. Limits", points: ["lim(x→a) f(x) describes behavior near a point", "L'Hôpital's Rule: use for 0/0 or ∞/∞ forms", "Squeeze Theorem: if g(x) ≤ f(x) ≤ h(x) and g,h → L then f → L"] },
            { heading: "2. Derivatives", points: ["d/dx(xⁿ) = nxⁿ⁻¹ (Power Rule)", "Product rule: d/dx(uv) = u'v + uv'", "Chain rule: d/dx[f(g(x))] = f'(g(x))·g'(x)", "d/dx(sin x) = cos x, d/dx(cos x) = −sin x"] },
            { heading: "3. Integration", points: ["∫xⁿ dx = xⁿ⁺¹/(n+1) + C", "∫sin x dx = −cos x + C", "∫eˣ dx = eˣ + C", "Fundamental Theorem: ∫ₐᵇ f(x)dx = F(b) − F(a)"] },
        ],
    };

    // Return topic-specific notes or generic notes
    if (allNotes[topic]) return allNotes[topic];

    return [
        { heading: `1. Overview of ${topic}`, points: [`${topic} is a fundamental topic in ${subject}`, "Understanding concepts deeply is key to mastery", "Practice regularly for best results"] },
        { heading: "2. Core Concepts", points: ["Review your textbook for detailed definitions", "Make mind maps to connect topics", "Use mnemonics for formulas", "Solve at least 10 problems per topic"] },
        { heading: "3. Practice Strategy", points: ["Start with easy problems to build confidence", "Gradually increase difficulty", "Review mistakes and understand WHY you got it wrong", "Take timed mock tests every week"] },
        { heading: "4. Exam Tips", points: ["Read all questions first before attempting", "Allocate time per question based on marks", "Show all working steps for full marks", "Double-check calculations at the end"] },
    ];
};

export const generateWeeklyReport = (student, subjects) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Cover header
    doc.setFillColor(15, 15, 35);
    doc.rect(0, 0, pageWidth, 60, 'F');

    doc.setFillColor(99, 102, 241);
    doc.rect(0, 50, pageWidth, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Weekly Performance Report", margin, 28);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`${student.name} | ${student.grade}`, margin, 42);

    doc.setTextColor(60, 60, 80);
    doc.setFontSize(10);
    doc.text(`Report generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}`, margin, 72);
    doc.text(`Current Streak: 🔥 ${student.streak} days  |  Level: ⚡ ${student.level}  |  Total XP: ${student.xp.toLocaleString()}`, margin, 82);

    // Score table header
    let y = 102;
    doc.setFillColor(99, 102, 241);
    doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Subject", margin + 4, y + 7);
    doc.text("Progress", 110, y + 7);
    doc.text("XP Earned", 155, y + 7);

    y += 12;
    subjects.forEach((s, i) => {
        doc.setFillColor(i % 2 === 0 ? 248 : 255, 248, 255);
        doc.rect(margin, y, pageWidth - margin * 2, 9, 'F');
        doc.setTextColor(40, 40, 60);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(s.name, margin + 4, y + 6.5);
        doc.text(`${s.progress}%`, 110, y + 6.5);
        doc.text(`${s.xpEarned.toLocaleString()} XP`, 155, y + 6.5);
        y += 10;
    });

    doc.save(`Weekly_Report_${student.name.replace(' ', '_')}.pdf`);
};
