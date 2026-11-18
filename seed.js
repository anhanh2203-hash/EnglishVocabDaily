// Dữ liệu minh họa do dự án biên soạn; KHÔNG phải trích nguyên văn hoặc xác nhận là danh sách từ theo Unit của sách Global Success.
// Mỗi khối có 20 mục: 10 nghĩa EN→VI, 5 nghĩa VI→EN và 5 câu ngữ cảnh.
const vocab = {
  6: [
    ['classmate','bạn cùng lớp'],['schoolbag','cặp sách'],['calculator','máy tính cầm tay'],['library','thư viện'],['playground','sân chơi'],
    ['bedroom','phòng ngủ'],['wardrobe','tủ quần áo'],['neighbourhood','khu dân cư'],['museum','bảo tàng'],['waterfall','thác nước'],
    ['healthy','khỏe mạnh'],['exercise','bài tập thể dục'],['recycle','tái chế'],['festival','lễ hội'],['island','hòn đảo'],
    ['uniform','đồng phục','Students wear their school _____ on Mondays.'],['homework','bài tập về nhà','I finish my _____ before dinner.'],['compass','la bàn','We use a _____ to find directions.'],['desert','sa mạc','A _____ is a very dry place with little rain.'],['pollution','sự ô nhiễm','Air _____ can cause breathing problems.']
  ],
  7: [
    ['hobby','sở thích'],['collect','sưu tầm'],['volunteer','tình nguyện viên'],['community','cộng đồng'],['donate','quyên góp'],
    ['sunburn','cháy nắng'],['obesity','bệnh béo phì'],['performance','buổi biểu diễn'],['portrait','tranh chân dung'],['ingredient','nguyên liệu'],
    ['transport','phương tiện vận chuyển'],['traffic jam','tắc đường'],['energy','năng lượng'],['electricity','điện năng'],['celebration','lễ kỷ niệm'],
    ['charity','tổ chức từ thiện','The school raised money for a local _____.'],['reuse','tái sử dụng','We should _____ old shopping bags instead of throwing them away.'],['composer','nhà soạn nhạc','A _____ writes pieces of music.'],['helmet','mũ bảo hiểm','Wear a _____ when riding a motorbike.'],['solar','thuộc năng lượng mặt trời','_____ panels turn sunlight into electricity.']
  ],
  8: [
    ['leisure','thời gian rảnh'],['craft','đồ thủ công'],['nomadic','du mục'],['ethnic','thuộc dân tộc'],['minority','thiểu số'],
    ['custom','phong tục'],['tradition','truyền thống'],['generation','thế hệ'],['disaster','thảm họa'],['earthquake','động đất'],
    ['communication','sự giao tiếp'],['technology','công nghệ'],['privacy','quyền riêng tư'],['pressure','áp lực'],['concentrate','tập trung'],
    ['folk','dân gian','We listened to traditional _____ songs at the festival.'],['harvest','thu hoạch','Farmers _____ rice when it is ripe.'],['flood','lũ lụt','Heavy rain caused a _____ in the village.'],['online','trực tuyến','We attended an _____ meeting using a video app.'],['stress','căng thẳng','Taking breaks can reduce _____ before exams.']
  ],
  9: [
    ['heritage','di sản'],['preserve','bảo tồn'],['artisan','nghệ nhân'],['craftsman','thợ thủ công'],['metropolitan','thuộc đô thị lớn'],
    ['convenient','thuận tiện'],['facility','cơ sở vật chất'],['multicultural','đa văn hóa'],['independence','sự độc lập'],['generation gap','khoảng cách thế hệ'],
    ['occupation','nghề nghiệp'],['qualification','trình độ chuyên môn'],['environmental','thuộc môi trường'],['biodiversity','đa dạng sinh học'],['sustainable','bền vững'],
    ['restore','trùng tu','Experts will _____ the old temple to protect its original design.'],['commute','đi lại hằng ngày','Many people _____ to work by bus.'],['deadline','hạn chót','Please submit your project before the _____.'],['counsellor','chuyên viên tư vấn','A school _____ can help students manage exam stress.'],['destination','điểm đến','Ha Long Bay is a popular tourist _____.']
  ],
  10: [
    ['household','hộ gia đình'],['responsibility','trách nhiệm'],['breadwinner','người kiếm thu nhập chính'],['gratitude','lòng biết ơn'],['voluntary','tự nguyện'],
    ['awareness','nhận thức'],['campaign','chiến dịch'],['contribution','sự đóng góp'],['invention','phát minh'],['device','thiết bị'],
    ['artificial intelligence','trí tuệ nhân tạo'],['deforestation','nạn phá rừng'],['ecosystem','hệ sinh thái'],['conservation','sự bảo tồn'],['renewable','có thể tái tạo'],
    ['chore','việc nhà','Washing the dishes is a household _____.'],['audience','khán giả','The _____ applauded after the concert.'],['volunteerism','tinh thần tình nguyện','Community projects encourage _____ among teenagers.'],['emission','sự phát thải','Factories should reduce carbon _____.'],['innovation','sự đổi mới','Technological _____ can improve healthcare.']
  ],
  11: [
    ['generation','thế hệ'],['conflict','xung đột'],['independent','độc lập'],['symptom','triệu chứng'],['nutritious','giàu dinh dưỡng'],
    ['longevity','tuổi thọ'],['urbanisation','đô thị hóa'],['infrastructure','cơ sở hạ tầng'],['heritage site','địa điểm di sản'],['scholarship','học bổng'],
    ['qualification','bằng cấp hoặc trình độ'],['internship','kỳ thực tập'],['biodiversity','đa dạng sinh học'],['carbon footprint','dấu chân carbon'],['adaptation','sự thích ứng'],
    ['balanced','cân bằng','A _____ diet contains a variety of nutrients.'],['generation gap','khoảng cách thế hệ','Different values may widen the _____ between parents and teenagers.'],['pedestrian','người đi bộ','A _____ should use the zebra crossing.'],['preservation','sự bảo tồn','The _____ of ancient buildings benefits future generations.'],['employability','khả năng tìm được việc làm','Communication skills can improve a graduate’s _____.']
  ],
  12: [
    ['globalisation','toàn cầu hóa'],['multiculturalism','chủ nghĩa đa văn hóa'],['integration','sự hội nhập'],['entrepreneurship','tinh thần khởi nghiệp'],['recruitment','hoạt động tuyển dụng'],
    ['resilience','khả năng phục hồi'],['qualification','trình độ chuyên môn'],['sustainability','tính bền vững'],['innovation','sự đổi mới'],['automation','tự động hóa'],
    ['inequality','sự bất bình đẳng'],['urbanisation','đô thị hóa'],['conservation','sự bảo tồn'],['biodiversity','đa dạng sinh học'],['digital literacy','năng lực sử dụng công nghệ số'],
    ['applicant','người ứng tuyển','Each job _____ must submit a CV and a cover letter.'],['adaptable','có khả năng thích nghi','Employees need to be _____ in a changing workplace.'],['renewable','có thể tái tạo','Wind and solar power are _____ energy sources.'],['internship','kỳ thực tập','An _____ helps students gain practical workplace experience.'],['emissions','lượng khí thải','Electric vehicles may help reduce urban transport _____.']
  ]
};
function questionsForGrade(grade) {
  const entries=vocab[grade];
  return entries.map((entry, idx)=>{
    const [word, meaning, example]=entry;
    let type, prompt, correct, wrongPool;
    if(idx<10){ type='en-vi'; prompt=`“${word}” có nghĩa là gì?`; correct=meaning; wrongPool=entries.filter((_,i)=>i!==idx).map(v=>v[1]); }
    else if(idx<15){ type='vi-en'; prompt=`Từ/cụm từ tiếng Anh nào có nghĩa là “${meaning}”?`; correct=word; wrongPool=entries.filter((_,i)=>i!==idx).map(v=>v[0]); }
    else { type='context'; prompt=example.replace('_____','_____'); correct=word; wrongPool=entries.filter((_,i)=>i!==idx).map(v=>v[0]); }
    // Tạo nhiễu cố định từ cùng nhóm từ vựng, bảo đảm bốn phương án khác nhau.
    const distractors=[...new Set(wrongPool.filter(w=>w!==correct))].slice((idx*3)%9,(idx*3)%9+3);
    while(distractors.length<3){let candidate=wrongPool.find(w=>w!==correct&&!distractors.includes(w)); if(!candidate)break; distractors.push(candidate)}
    return {grade,unit:'Tổng ôn minh họa',type,word, prompt,options:[correct,...distractors],answer:0,
      explanation: type==='context' ? `“${word}” nghĩa là “${meaning}”. Câu: ${example.replace('_____',word)}` : `“${word}” có nghĩa là “${meaning}”.`};
  });
}
module.exports={vocab,questionsForGrade};
