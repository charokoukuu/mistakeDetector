import { Box, Button, Fab } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './App.css';
import { Grid } from '@mui/material';
import { SketchPicker } from 'react-color';
import Dialog from '@mui/material/Dialog';
import Slider from '@mui/material/Slider';
const cv = (window as any).cv;
type Load = "特徴点マッピング" | "差分抽出" | "二値化" | "ノイズ除去" | "輪郭抽出" | "完了";
type Status = "select1" | "select2" | "edit" | "loading" | "complete";
let imgA: any, imgB: any;

interface PosData {
  x: number,
  y: number,
  width: number,
  height: number,
}

function App() {
  const [load, setLoad] = useState<Load>("特徴点マッピング");
  const [status, setStatus] = useState<Status>("select1");
  const [imgAFile, setImgAFile] = useState<File>();
  const [imgBFile, setImgBFille] = useState<File>();
  let posDataValue: Array<PosData> = [];
  const [posData, setPosData] = useState<Array<PosData>[]>([]);

  let noise = 2;
  let judgeColor = [255, 0, 0];
  let judgeRange = 45;
  let baseImg: "imgA" | "imgB" = "imgA";

  const buttonClick = () => {
    try {
      setStatus("complete");
      const result = new cv.Mat();
      const grayA = new cv.Mat();
      const grayB = new cv.Mat();

      let srcgray = new cv.Mat();
      let templgray = new cv.Mat();
      cv.cvtColor(imgA, srcgray, cv.COLOR_RGBA2GRAY);
      cv.cvtColor(imgB, templgray, cv.COLOR_RGBA2GRAY);
      var akaze = new cv.AKAZE();

      var templkp = new cv.KeyPointVector();
      var templdas = new cv.Mat();
      let templmask = new cv.Mat();
      akaze.detectAndCompute(templgray, templmask, templkp, templdas);
      let templview = new cv.Mat();
      cv.drawKeypoints(templgray, templkp, templview);
      var srckp = new cv.KeyPointVector();
      var srcdas = new cv.Mat();
      let srcmask = new cv.Mat();
      akaze.detectAndCompute(srcgray, srcmask, srckp, srcdas);
      let srcview = new cv.Mat();
      cv.drawKeypoints(srcgray, srckp, srcview);
      var bf = new cv.BFMatcher();
      var matches = new cv.DMatchVectorVector();
      bf.knnMatch(templdas, srcdas, matches, 2);
      var arr = [];
      var good_matches = new cv.DMatchVector();
      for (let i = 0; i < matches.size(); ++i) {
        let match = matches.get(i);
        let dMatch1 = match.get(0);
        let dMatch2 = match.get(1);
        if (dMatch1.distance <= dMatch2.distance * 0.8) {
          good_matches.push_back(dMatch1);
        }
      }
      console.log("good_matches : " + good_matches.size());
      var img_matches = new cv.Mat();
      let transformedIm = new cv.Mat();
      cv.drawMatches(templgray, templkp, srcgray, srckp, good_matches, img_matches);
      if (good_matches.size() > 10) {
        let srcPoints = [];
        let dstPoints = [];
        for (let k = 0; k < good_matches.size(); ++k) {
          srcPoints.push(templkp.get(good_matches.get(k).queryIdx).pt.x);
          srcPoints.push(templkp.get(good_matches.get(k).queryIdx).pt.y);
          dstPoints.push(srckp.get(good_matches.get(k).trainIdx).pt.x);
          dstPoints.push(srckp.get(good_matches.get(k).trainIdx).pt.y);
        }
        let srcPointsMatArr = cv.matFromArray(srcPoints.length / 2, 1, cv.CV_32FC2, srcPoints);
        let dstPointsMatArr = cv.matFromArray(dstPoints.length / 2, 1, cv.CV_32FC2, dstPoints);
        const homo = cv.findHomography(srcPointsMatArr, dstPointsMatArr, cv.RANSAC, 5.0);
        cv.warpPerspective(imgB, transformedIm, homo, new cv.Size(imgB.cols, imgB.rows));
      }
      setLoad("差分抽出");
      cv.cvtColor(imgA, grayA, cv.COLOR_BGR2RGB);
      cv.cvtColor(transformedIm, grayB, cv.COLOR_BGR2RGB);

      cv.absdiff(grayA, grayB, result);
      cv.cvtColor(result, result, cv.COLOR_BGR2GRAY);
      setLoad("二値化");
      cv.threshold(result, result, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      setLoad("ノイズ除去");

      let kernel = cv.Mat.ones(noise, noise, cv.CV_8U);
      let anchor = new cv.Point(-1, -1);
      cv.morphologyEx(result, result, cv.MORPH_OPEN, kernel, anchor, 1,
        cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      setLoad("輪郭抽出");
      cv.findContours(result, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE, {
        x: 0,
        y: 0
      });
      const addWeightedMat = new cv.Mat();
      const convertA = new cv.Mat();
      const convertB = new cv.Mat();
      cv.cvtColor(imgA, convertA, cv.COLOR_RGBA2RGB);
      cv.cvtColor(imgB, convertB, cv.COLOR_RGBA2RGB);
      const baseImageA = convertA.clone();
      const baseImageB = convertB.clone();
      let isJudge = false;
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);
        if (rect.width > 50 - judgeRange && rect.height > 50 - judgeRange) {
          isJudge = true;
          console.log(rect.x + "," + rect.y + "," + rect.width + "," + rect.height);
          posDataValue.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          });

          baseImg === "imgA" && cv.rectangle(convertA, new cv.Point(rect.x, rect.y), new cv.Point(rect.x + rect.width, rect.y + rect.height), new cv.Scalar(judgeColor[0], judgeColor[1], judgeColor[2]), -1, cv.LINE_8, 0);
          baseImg === "imgA" && cv.addWeighted(baseImageA, 0.3, convertA, 0.7, 2.2, addWeightedMat);

          baseImg === "imgB" && cv.rectangle(convertB, new cv.Point(rect.x, rect.y), new cv.Point(rect.x + rect.width, rect.y + rect.height), new cv.Scalar(judgeColor[0], judgeColor[1], judgeColor[2]), -1, cv.LINE_8, 0);
          baseImg === "imgB" && cv.addWeighted(baseImageB, 0.3, convertB, 0.7, 2.2, addWeightedMat);
        }
      }
      setPosData([...posData, posDataValue]);
      setLoad("完了");
      cv.imshow('canvasOutput3', result);
      cv.imshow('canvasOutput4', addWeightedMat);
      if (isJudge !== true) alert("検知されませんでした")
    } catch {
      alert("アップロードされた2枚の画像サイズが違うため、正常に処理できませんでした。\n同じサイズの画像をアップロードしてください。");
    }

  }
  useEffect(() => {
    imgAFile !== undefined && setStatus("select2");
    imgBFile !== undefined && setStatus("edit");
  }, [imgAFile, imgBFile]);

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: "1vw",
      boxShadow: " 0px 3px 6px #00000029",
      width: "98vw",
      margin: "0 auto",
      paddingBottom: status !== "edit" ? "10vh" : "0",
    }}>
      <Grid container alignItems="center" justifyContent="center" spacing={3}>
        {(status === "select1") && <Grid item xs={12}><h2 className='japanese_L' style={{ textAlign: "center" as "center", color: "#5BC0C4" }}>2枚の画像をそれぞれアップロードしてください (0/2)</h2></Grid>}
        {(status === "select2") && <Grid item xs={12}><h2 className='japanese_L' style={{ textAlign: "center" as "center", color: "#5BC0C4" }}>2枚の画像をそれぞれアップロードしてください (1/2)</h2></Grid>}
        {(status === "edit") && <Grid item xs={12}><h2 className='japanese_L' style={{ textAlign: "center" as "center", color: "#5BC0C4" }}>詳細設定</h2></Grid>}
        {(status === "complete") && <Grid item xs={12}><h2 className='japanese_L' style={{ textAlign: "center" as "center", color: "#5BC0C4" }}>判定結果</h2></Grid>}
        <Grid item xs={2}></Grid>
        <Grid item xs={4}>
          {<UploadFile setFile={(file) => {
            if (file && file[0]) {
              const img = new Image()
              img.onload = () => {
                imgA = cv.imread(img)
                cv.imshow('canvasOutput', imgA)
              }
              setImgAFile(file[0])
              img.src = URL.createObjectURL(file[0])
            }
          }} status={status} id={"canvasOutput"} />
          }
        </Grid>
        <Grid item xs={4}>

          {<UploadFile setFile={(file) => {
            if (file && file[0]) {
              const img = new Image()
              img.onload = () => {
                imgB = cv.imread(img)
                cv.imshow('canvasOutput2', imgB)
              }
              setImgBFille(file[0])
              img.src = URL.createObjectURL(file[0])
            }
          }} status={status} id={"canvasOutput2"} />
          }
        </Grid>
        <Grid item xs={2}></Grid>
        <Grid item xs={12}></Grid>
        <Grid item xs={6}>

          <canvas id="canvasOutput3" style={{
            width: (status === "complete") ? "45vw" : "0", margin: "0 auto", marginTop: "5vh", marginLeft: "2.5vw",
          }}></canvas>
        </Grid>
        <Grid item xs={6}>
          <canvas id="canvasOutput4" style={{
            width: (status === "complete") ? "45vw" : "0", margin: "0 auto", marginTop: "5vh", textAlign: "center" as "center"
          }}></canvas>
        </Grid>
      </Grid>
      {status === "edit" && <EditMenu onClick={(noiseValue: number, rgb: number[], judgeValue: number, synth: "imgA" | "imgB") => {
        noise = noiseValue;
        judgeColor = rgb;
        judgeRange = judgeValue;
        baseImg = synth;
        buttonClick();
      }} />}
      {status === "complete" && <Complete imgDownload={() => {
        let canvas = document.getElementById("canvasOutput4") as HTMLCanvasElement;
        let link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "result.png";
        link.click();
      }} posDownload={() => {
        console.log(JSON.stringify(posData));
        const blob = new Blob([JSON.stringify(posData, null, '  ')], { type: 'application\/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'posData.json';
        link.click();
      }} prevMove={() => { setStatus("edit") }} topMove={() => { window.location.reload() }} />}
    </div>
  );
}

interface Upload {
  setFile: (file: File[]) => void;
  status: Status;
  id: string;
}
const UploadFile = (props: Upload) => {

  const onDrop = useCallback((acceptedFiles: File[]) => {
    props.setFile(acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop });
  useEffect(() => {
  }, [isDragActive]);
  return (
    <div>
      <div {...getRootProps()} style={{
        width: "30vw",
        height: "30vw",
        boxShadow: "inset 0px 3px 6px #00000029, 0px 3px 6px #00000029",
        position: "relative",
        marginTop: "1vw",
        borderRadius: "1vw"
      }}>
        <input {...getInputProps()} />
        {
          isDragActive ?
            <div style={{
              position: "absolute",
              backgroundColor: "rgba(0,0,0,0.5)",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              borderRadius: "1vw"

            }} >
              <div><p className="japanese_L" style={{ textAlign: "center" as "center" }}>アップロード！</p></div> </div> :


            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",

            }} >

              <Button onClick={open} variant="contained" style={{
                margin: "auto", padding: "1.3vw 2vw", marginTop: "13vh", backgroundColor: "#5BC0C4", textAlign: "center" as "center", position: 'absolute', left: '50%', top: '4%',
                transform: 'translate(-50%, -50%)'
              }}>
                <div className="japanese_B" style={{ fontSize: "1.2vw" }}>ファイルを選択</div></Button>

              <div><p className="japanese_L" style={{ textAlign: "center" as "center", position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: "1.2vw" }}>

                <br />
                <br />
                <b className='japanese_B' style={{ fontSize: "3vw" }}>or</b>
                <br />
                <br />
                ファイルをここに
                <br />
                <b style={{ color: "#5BC0C4" }}>ドラッグ&ドロップ</b>してください</p></div>
              <canvas style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                borderRadius: "1vw"
              }} id={props.id} ></canvas>
            </div>
        }
      </div>

    </div >
  )
}

interface EditMenuProps {
  onClick: (noiseValue: number, rgb: number[], judgeValue: number, synth: "imgA" | "imgB") => void;
}
const EditMenu = (props: EditMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  interface RGB {
    r: number;
    g: number;
    b: number;
  }
  interface Color {
    hex: string;
    rgb: RGB;
  }
  const [state, setState] = useState({ background: '#FF0000' });
  const [synthImg, setSynthImg] = useState<"imgA" | "imgB">("imgA");
  const [noiseValue, setNoiseValue] = useState<number>(2);
  const [judgeValue, setJudgeValue] = useState<number>(45);
  const [rgb, setRgb] = useState<number[]>([255, 0, 0]);
  const handleChangeComplete = (color: Color) => {
    setState({ background: color.hex });
    setRgb([color.rgb.r, color.rgb.g, color.rgb.b])
  };
  function noise(value: number) {
    return `${value}`;
  }
  function judgeArea(value: number) {
    return `${value}`;
  }
  const selectPurpose = (value: "imgA" | "imgB") => {
    setSynthImg(value);

  }

  const defaultButton = {
    backgroundColor: "#E6E6E6",
    boxShadow: "none",
    width: "16vw",
    height: "11vh",
    borderRadius: "10px",

  }
  const plessButton = {
    backgroundColor: "#65FFA062",
    boxShadow: "inset 0px 1px 6px #00000029",
    width: "16vw",
    height: "11vh",
    borderRadius: "10px",
    margin: "0 auto",




  }
  return (
    <div style={{
      marginTop: "8vh",
    }}>
      <Grid container alignItems="center" justifyContent="center" spacing={0}>
        <Grid item xs={7.5}>
          <div className='japanese_L' style={{ textAlign: "center" as "center" }}>ノイズ除去感度</div>
          <Box sx={{ width: 300, margin: "0 auto" }}>
            <Slider
              aria-label="noise"
              defaultValue={1}
              getAriaValueText={noise}
              valueLabelDisplay="auto"
              step={1}
              marks
              min={1}
              max={5}
              onChange={(event: Event, value: number | number[]) => { setNoiseValue(value as number) }}
            />
          </Box>
        </Grid>
        <Grid item xs={4.5}>
          <div className='japanese_L' style={{}}>判定結果の色</div>
          <Fab onClick={handleClickOpen} style={{ backgroundColor: state.background, margin: "0 auto", marginLeft: "1.2vw" }}>
          </Fab>
        </Grid>
        <Grid item xs={12}>
          <div className='japanese_L' style={{ textAlign: "center" as "center" }}>検知範囲</div>
          <Box sx={{ width: 300, margin: "0 auto" }}>
            <Slider
              aria-label="noise"
              defaultValue={45}
              getAriaValueText={judgeArea}
              valueLabelDisplay="auto"
              step={1}
              marks
              min={0}
              max={50}
              onChange={(event: Event, value: number | number[]) => { setJudgeValue(value as number) }}
            />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <div className='japanese_L' style={{ textAlign: "center" as "center", marginTop: "5vh", marginBottom: "2vh" }}>合成元画像</div>
        </Grid>
        <Grid item xs={2} >
          <Button
            variant="contained"
            onClick={() => { selectPurpose("imgA") }}
            style={(synthImg === "imgA") ? plessButton : defaultButton}

          >
            <div className="japanese_L" style={{ textAlign: "center" as "center", color: "#707070", fontSize: "3vw" }}>画像1</div>
          </Button>
        </Grid>

        <Grid item xs={2} >
          <Button
            variant="contained"
            onClick={() => { selectPurpose("imgB") }}
            style={(synthImg === "imgB") ? plessButton : defaultButton}
          >
            <div className="japanese_L" style={{ textAlign: "center" as "center", color: "#707070", fontSize: "3vw" }}>画像2</div>
          </Button>
        </Grid>
      </Grid>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >

        <SketchPicker
          color={state.background}
          onChangeComplete={handleChangeComplete}

        />
      </Dialog>
      <Button fullWidth style={{
        padding: "1vw 13vw",
        fontSize: "1.8vw",
        marginTop: "3vw",
        backgroundColor: "#3BABE6",
      }} onClick={() => { props.onClick(noiseValue, rgb, judgeValue, synthImg) }} variant="contained"><b>判定する</b></Button>
    </div >
  )
}

interface CompleteProps {
  imgDownload: () => void;
  posDownload: () => void;
  prevMove: () => void;
  topMove: () => void;
}

const Complete = (props: CompleteProps) => {
  return (
    <div>
      <Grid container alignItems="center" justifyContent="center" spacing={3}>
        <Grid item xs={6}>
          <Button fullWidth style={{
            padding: "1vw 13vw",
            fontSize: "1.8vw",
            marginTop: "3vw",
          }} onClick={props.imgDownload} variant="contained"><b>ダウンロード</b></Button>
        </Grid>
        <Grid item xs={6}>
          <Button fullWidth style={{
            padding: "1vw 13vw",
            fontSize: "1.8vw",
            marginTop: "3vw",
            backgroundColor: "#E6903B",
          }} onClick={props.posDownload} variant="contained"><b>座標書き出し</b></Button>
        </Grid>
      </Grid>
      <Button fullWidth style={{
        padding: "1vw 13vw",
        fontSize: "1.8vw",
        marginTop: "3vw",
        backgroundColor: "#3BABE6",
      }} onClick={props.prevMove} variant="contained"><b>詳細設定に戻る</b></Button>
      <Button fullWidth style={{
        padding: "1vw 13vw",
        fontSize: "1.8vw",
        marginTop: "3vw",
        backgroundColor: "#797979",
      }} onClick={props.topMove} variant="contained"><b>トップへ戻る</b></Button>
    </div>
  )
}


export default App;
